package devPilot.backend.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import devPilot.backend.dto.ChatMessageRequest;
import devPilot.backend.dto.ChatSessionDetailResponse;
import devPilot.backend.dto.ChatSessionResponse;
import devPilot.backend.dto.CreateChatSessionRequest;
import devPilot.backend.security.CurrentUser;
import devPilot.backend.services.chat.ChatSessionService;
import devPilot.backend.services.chat.ChatStreamService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChatController {
    private final CurrentUser currentUser;
    private final ChatSessionService sessionService;
    private final ChatStreamService streamService;

    @GetMapping("/repos/{repoId}/chat/sessions")
    public List<ChatSessionResponse> listSessions(@PathVariable UUID repoId){
        return sessionService.listSessions(currentUser.require().getId(), repoId);
    }

    @PostMapping("/repos/{repoId}/chat/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(
            @PathVariable UUID repoId,
            @RequestBody(required = false) CreateChatSessionRequest body){
        UUID userId = currentUser.require().getId();
        ChatSessionResponse created = sessionService.createSession(userId, repoId, body != null ? body.title() : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/chat/sessions/{sessionId}")
    public ChatSessionDetailResponse getSession(@PathVariable UUID sessionId){
        return sessionService.getSession(currentUser.require().getId(), sessionId);
    }

    @DeleteMapping("/chat/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID sessionId){
        sessionService.deleteSession(currentUser.require().getId(), sessionId);
        return ResponseEntity.noContent().build();
    }

    /** Streams the answer as Server-Sent Events. See ChatStreamService for the event protocol. */
    @PostMapping(value = "/chat/sessions/{sessionId}/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter ask(
            @PathVariable UUID sessionId,
            @RequestBody(required = false) ChatMessageRequest body,
            HttpServletResponse response){
        UUID userId = currentUser.require().getId();
        // Stop proxies (e.g. nginx) from buffering the stream.
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");
        return streamService.ask(userId, sessionId, body != null ? body.question() : null);
    }
}
