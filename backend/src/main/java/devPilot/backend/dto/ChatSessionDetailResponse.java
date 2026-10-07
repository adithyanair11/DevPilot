package devPilot.backend.dto;

import java.util.List;

public record ChatSessionDetailResponse(
    ChatSessionResponse session,
    List<ChatMessageResponse> messages
){

}
