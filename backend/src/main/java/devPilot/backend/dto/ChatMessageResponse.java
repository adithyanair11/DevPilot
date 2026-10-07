package devPilot.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import devPilot.backend.entity.ChatRole;

public record ChatMessageResponse(
    UUID id,
    ChatRole role,
    String content,
    List<CitationDto> citations,
    boolean incomplete,
    Instant createdAt
){

}
