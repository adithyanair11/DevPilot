package devPilot.backend.services.chat;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import devPilot.backend.dto.CitationDto;
import devPilot.backend.entity.ChatMessage;
import devPilot.backend.entity.ChatSession;
import devPilot.backend.entity.IndexStatus;
import devPilot.backend.entity.Repository;
import devPilot.backend.exceptions.BadRequestException;
import devPilot.backend.services.RepoService;
import devPilot.backend.services.ai.ChatPrompts;
import devPilot.backend.services.ai.CodeContextRetriever;
import devPilot.backend.services.ai.RagSettings;
import devPilot.backend.services.ai.RetrievedContext;
import lombok.extern.slf4j.Slf4j;
import reactor.core.Disposable;

/**
 * Answers a question in a chat session and streams the result over Server-Sent Events.
 *
 * Event protocol (every data payload is JSON):
 *   meta       {"session": ChatSessionResponse, "userMessage": ChatMessageResponse}
 *   citations  [CitationDto, ...]           numbered like the [n] markers in the answer
 *   token      {"text": "..."}              one per streamed piece of the answer
 *   done       {"message": ChatMessageResponse}   the saved assistant message
 *   error      {"message": "..."}           the stream then ends; partial text is saved
 */
@Service
@Slf4j
public class ChatStreamService {
    private final ChatSessionService sessionService;
    private final RepoService repoService;
    private final CodeContextRetriever contextRetriever;
    private final ChatModel chatModel;
    private final Executor chatExecutor;

    public ChatStreamService(
            ChatSessionService sessionService,
            RepoService repoService,
            CodeContextRetriever contextRetriever,
            ChatModel chatModel,
            @Qualifier("chatExecutor") Executor chatExecutor){
        this.sessionService = sessionService;
        this.repoService = repoService;
        this.contextRetriever = contextRetriever;
        this.chatModel = chatModel;
        this.chatExecutor = chatExecutor;
    }

    /**
     * Validates synchronously (so bad requests get a normal JSON error), saves the
     * question, then does retrieval + generation on a background thread.
     */
    public SseEmitter ask(UUID userId, UUID sessionId, String rawQuestion){
        String question = rawQuestion == null ? "" : rawQuestion.strip();
        if(question.isEmpty()){
            throw new BadRequestException("Question is required");
        }
        if(question.length() > RagSettings.MAX_QUESTION_LENGTH){
            throw new BadRequestException("Question must be at most " + RagSettings.MAX_QUESTION_LENGTH + " characters");
        }

        ChatSession session = sessionService.requireSession(userId, sessionId);
        Repository repo = repoService.requiredOwned(session.getRepositoryId(), userId);
        if(repo.getIndexStatus() != IndexStatus.READY){
            throw new BadRequestException("Repository is not indexed yet");
        }

        ChatMessage userMessage = sessionService.saveUserMessage(session, question);

        SseEmitter emitter = new SseEmitter(RagSettings.STREAM_TIMEOUT_MS);
        Stream stream = new Stream(emitter, session.getId());
        emitter.onTimeout(() -> stream.cancel("timeout"));
        emitter.onError(ex -> stream.cancel("connection error"));
        emitter.onCompletion(() -> stream.cancel("completed"));

        chatExecutor.execute(() -> stream.run(session, repo, userMessage, question));
        return emitter;
    }

    /** State for one streamed answer. */
    private final class Stream {
        private final SseEmitter emitter;
        private final UUID sessionId;
        private final StringBuilder answer = new StringBuilder();
        private final AtomicBoolean finished = new AtomicBoolean(false);
        private final AtomicReference<Disposable> subscription = new AtomicReference<>();
        private volatile List<CitationDto> citations = List.of();

        Stream(SseEmitter emitter, UUID sessionId){
            this.emitter = emitter;
            this.sessionId = sessionId;
        }

        void run(ChatSession session, Repository repo, ChatMessage userMessage, String question){
            try{
                List<ChatMessage> history = sessionService.recentHistory(
                        sessionId, userMessage.getId(), RagSettings.HISTORY_MESSAGES);

                send("meta", Map.of(
                        "session", sessionService.toResponse(sessionService.requireSession(session.getUserId(), sessionId)),
                        "userMessage", sessionService.toResponse(userMessage)));

                RetrievedContext context = contextRetriever.retrieve(
                        repo.getId(), ChatPrompts.retrievalQuery(question, history));
                citations = context.citations();
                send("citations", citations);

                Prompt prompt = new Prompt(ChatPrompts.buildMessages(repo, history, context.contextText(), question));

                Disposable d = chatModel.stream(prompt)
                        .map(Stream::textOf)
                        .filter(text -> !text.isEmpty())
                        .subscribe(this::onToken, this::onError, this::onComplete);
                subscription.set(d);
                if(finished.get()){
                    // The client went away while we were subscribing.
                    d.dispose();
                }
            }catch(Exception ex){
                onError(ex);
            }
        }

        private static String textOf(ChatResponse response){
            if(response == null || response.getResult() == null || response.getResult().getOutput() == null){
                return "";
            }
            String text = response.getResult().getOutput().getText();
            return text == null ? "" : text;
        }

        private void onToken(String text){
            if(finished.get()){
                return;
            }
            answer.append(text);
            send("token", Map.of("text", text));
        }

        private void onComplete(){
            if(!finished.compareAndSet(false, true)){
                return;
            }
            ChatMessage saved = sessionService.saveAssistantMessage(sessionId, answer.toString(), citations, false);
            sendQuietly("done", Map.of("message", sessionService.toResponse(saved)));
            emitter.complete();
        }

        private void onError(Throwable ex){
            if(!finished.compareAndSet(false, true)){
                return;
            }
            log.error("Chat stream failed for session {}", sessionId, ex);
            savePartial();
            sendQuietly("error", Map.of("message", friendlyMessage(ex)));
            emitter.complete();
        }

        /** Client disconnected, timed out, or the emitter finished. Stops the model call. */
        void cancel(String reason){
            Disposable d = subscription.get();
            if(d != null && !d.isDisposed()){
                d.dispose();
            }
            if(finished.compareAndSet(false, true)){
                log.info("Chat stream for session {} stopped early ({})", sessionId, reason);
                savePartial();
            }
        }

        private void savePartial(){
            if(answer.length() > 0){
                try{
                    sessionService.saveAssistantMessage(sessionId, answer.toString(), citations, true);
                }catch(Exception saveEx){
                    log.warn("Could not save partial answer for session {}: {}", sessionId, saveEx.getMessage());
                }
            }
        }

        /** Sends an event; if the client is gone, stops the stream. */
        private void send(String event, Object data){
            try{
                synchronized(emitter){
                    emitter.send(SseEmitter.event().name(event).data(data, MediaType.APPLICATION_JSON));
                }
            }catch(IOException | IllegalStateException ex){
                cancel("client disconnected");
                throw new ClientGoneException();
            }
        }

        private void sendQuietly(String event, Object data){
            try{
                synchronized(emitter){
                    emitter.send(SseEmitter.event().name(event).data(data, MediaType.APPLICATION_JSON));
                }
            }catch(IOException | IllegalStateException ignored){
                // Client already gone; nothing else to do.
            }
        }

        private String friendlyMessage(Throwable ex){
            if(ex instanceof ClientGoneException){
                return "Connection closed";
            }
            String msg = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
            if(msg.contains("rate limit") || msg.contains("429")){
                return "The AI service is rate limiting requests. Please try again in a moment.";
            }
            if(msg.contains("401") || msg.contains("api key") || msg.contains("unauthorized")){
                return "The AI service rejected the request. Check the OpenAI API key.";
            }
            return "Something went wrong while generating the answer. Please try again.";
        }
    }

    /** Internal signal that the client disconnected mid-stream. */
    private static final class ClientGoneException extends RuntimeException {
        ClientGoneException(){
            super(null, null, false, false);
        }
    }
}
