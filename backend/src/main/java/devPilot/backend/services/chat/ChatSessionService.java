package devPilot.backend.services.chat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import devPilot.backend.dto.ChatMessageResponse;
import devPilot.backend.dto.ChatSessionDetailResponse;
import devPilot.backend.dto.ChatSessionResponse;
import devPilot.backend.dto.CitationDto;
import devPilot.backend.entity.ChatMessage;
import devPilot.backend.entity.ChatRole;
import devPilot.backend.entity.ChatSession;
import devPilot.backend.exceptions.NotFoundException;
import devPilot.backend.repository.ChatMessageRepository;
import devPilot.backend.repository.ChatSessionRepository;
import devPilot.backend.services.RepoService;
import devPilot.backend.services.ai.CitationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Persistence for chat sessions and messages. Every lookup is scoped to the owning user. */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatSessionService {
    public static final String DEFAULT_TITLE = "New chat";
    private static final int MAX_TITLE_LENGTH = 80;
    private static final TypeReference<List<CitationDto>> CITATION_LIST = new TypeReference<>() {
    };

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final RepoService repoService;
    private final CitationMapper citationMapper;
    private final JsonMapper jsonMapper;

    // ---------------------------------------------------------------- sessions

    @Transactional(readOnly = true)
    public List<ChatSessionResponse> listSessions(UUID userId, UUID repositoryId){
        repoService.requiredOwned(repositoryId, userId);
        return sessionRepository.findByUserIdAndRepositoryIdOrderByUpdatedAtDesc(userId, repositoryId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ChatSessionResponse createSession(UUID userId, UUID repositoryId, String title){
        repoService.requiredOwned(repositoryId, userId);
        ChatSession session = ChatSession.builder()
                .userId(userId)
                .repositoryId(repositoryId)
                .title(cleanTitle(title, DEFAULT_TITLE))
                .build();
        return toResponse(sessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public ChatSessionDetailResponse getSession(UUID userId, UUID sessionId){
        ChatSession session = requireSession(userId, sessionId);
        List<ChatMessageResponse> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(this::toResponse)
                .toList();
        return new ChatSessionDetailResponse(toResponse(session), messages);
    }

    @Transactional
    public void deleteSession(UUID userId, UUID sessionId){
        ChatSession session = requireSession(userId, sessionId);
        messageRepository.deleteAllBySessionId(session.getId());
        sessionRepository.delete(session);
    }

    @Transactional(readOnly = true)
    public ChatSession requireSession(UUID userId, UUID sessionId){
        return sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new NotFoundException("Chat session not found"));
    }

    // ---------------------------------------------------------------- messages

    /** Saves the user's question and, on the first question, names the session after it. */
    @Transactional
    public ChatMessage saveUserMessage(ChatSession session, String question){
        if(DEFAULT_TITLE.equals(session.getTitle())){
            session.setTitle(cleanTitle(question, DEFAULT_TITLE));
        }
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);

        return messageRepository.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role(ChatRole.USER)
                .content(question)
                .build());
    }

    @Transactional
    public ChatMessage saveAssistantMessage(UUID sessionId, String content, List<CitationDto> citations, boolean incomplete){
        ChatMessage saved = messageRepository.save(ChatMessage.builder()
                .sessionId(sessionId)
                .role(ChatRole.ASSISTANT)
                .content(content)
                .citations(citationMapper.toJson(citations))
                .incomplete(incomplete)
                .build());

        sessionRepository.findById(sessionId).ifPresent(s -> {
            s.setUpdatedAt(Instant.now());
            sessionRepository.save(s);
        });
        return saved;
    }

    /** The last {@code limit} messages before {@code excludeId}, oldest first. */
    @Transactional(readOnly = true)
    public List<ChatMessage> recentHistory(UUID sessionId, UUID excludeId, int limit){
        List<ChatMessage> newestFirst = messageRepository.findBySessionIdOrderByCreatedAtDesc(
                sessionId, PageRequest.of(0, limit + 1));
        List<ChatMessage> history = new ArrayList<>();
        for(ChatMessage m : newestFirst){
            if(!m.getId().equals(excludeId) && history.size() < limit){
                history.add(0, m);
            }
        }
        return history;
    }

    // ---------------------------------------------------------------- mapping

    public ChatSessionResponse toResponse(ChatSession s){
        return new ChatSessionResponse(s.getId(), s.getRepositoryId(), s.getTitle(), s.getCreatedAt(), s.getUpdatedAt());
    }

    public ChatMessageResponse toResponse(ChatMessage m){
        return new ChatMessageResponse(m.getId(), m.getRole(), m.getContent(), parseCitations(m.getCitations()),
                m.isIncomplete(), m.getCreatedAt());
    }

    private List<CitationDto> parseCitations(String json){
        if(json == null || json.isBlank()){
            return List.of();
        }
        try{
            return jsonMapper.readValue(json, CITATION_LIST);
        }catch(RuntimeException ex){
            log.warn("Could not parse stored citations: {}", ex.getMessage());
            return List.of();
        }
    }

    private static String cleanTitle(String raw, String fallback){
        if(raw == null || raw.isBlank()){
            return fallback;
        }
        String oneLine = raw.strip().replaceAll("\\s+", " ");
        return oneLine.length() > MAX_TITLE_LENGTH
                ? oneLine.substring(0, MAX_TITLE_LENGTH - 1).strip() + "…"
                : oneLine;
    }
}
