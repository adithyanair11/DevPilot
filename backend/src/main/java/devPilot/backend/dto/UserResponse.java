package devPilot.backend.dto;

import java.util.UUID;

public record UserResponse (
    Long id,
    String githubId,
    String githubUsername,
    String displayName,
    String avatarUrl
){


   
}
