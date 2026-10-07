package devPilot.backend.controllers;

import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import devPilot.backend.dto.RetrieveRequest;
import devPilot.backend.entity.IndexStatus;
import devPilot.backend.entity.Repository;
import devPilot.backend.exceptions.BadRequestException;
import devPilot.backend.security.CurrentUser;
import devPilot.backend.services.RepoService;
import devPilot.backend.services.ai.CodeContextRetriever;
import devPilot.backend.services.ai.RetrievedContext;
import lombok.RequiredArgsConstructor;

/**
 * Exposes the retrieval step of the RAG pipeline so the frontend can show which
 * code chunks match a question.
 */
@RestController
@RequestMapping("/api/repos")
@RequiredArgsConstructor
public class RetrievalController {
    private static final int MAX_QUESTION_LENGTH = 2000;

    private final CurrentUser currentUser;
    private final RepoService repoService;
    private final CodeContextRetriever contextRetriever;

    @PostMapping("/{id}/retrieve")
    public RetrievedContext retrieve(@PathVariable UUID id, @RequestBody(required = false) RetrieveRequest body){
        UUID userId = currentUser.require().getId();
        Repository repo = repoService.requiredOwned(id, userId);

        String question = body != null && body.question() != null ? body.question().trim() : "";
        if(question.isEmpty()){
            throw new BadRequestException("Question is required");
        }
        if(question.length() > MAX_QUESTION_LENGTH){
            throw new BadRequestException("Question must be at most " + MAX_QUESTION_LENGTH + " characters");
        }
        if(repo.getIndexStatus() != IndexStatus.READY){
            throw new BadRequestException("Repository is not indexed yet");
        }

        return contextRetriever.retrieve(id, question);
    }
}
