package devPilot.backend.dto;

/** Body for creating a session. The title is optional; it defaults to the first question. */
public record CreateChatSessionRequest(
    String title
){

}
