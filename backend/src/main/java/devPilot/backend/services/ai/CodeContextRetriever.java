package devPilot.backend.services.ai;

import java.util.List;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;

import devPilot.backend.dto.CitationDto;
import lombok.RequiredArgsConstructor;

/**
 * Retrieval step of the RAG pipeline: finds the code chunks most similar to the
 * question, restricted to a single repository, and formats them as numbered
 * context blocks for the prompt plus a matching list of citations.
 */
@Service 
@RequiredArgsConstructor 
public class CodeContextRetriever {
    private static final String NO_MATCHES = "(no matching code chunks found)";
    private final VectorStore vectorStore;
    private final CitationMapper citationMapper;


    public RetrievedContext retrieve(UUID repositoryId, String question){
        if(repositoryId == null || question == null || question.isBlank()){
            return empty();
        }

        SearchRequest request = SearchRequest.builder()
                .query(question.trim())
                .topK(RagSettings.TOP_K_CHUNKS)
                .filterExpression(new FilterExpressionBuilder()
                        .eq(RagSettings.METADATA_REPO_ID, repositoryId.toString())
                        .build())
                .build();

        List<Document> documents = vectorStore.similaritySearch(request);
        if(documents == null || documents.isEmpty()){
            return empty();
        }

        List<CitationDto> citations = citationMapper.fromDocuments(documents);
        return new RetrievedContext(citations, buildContextText(documents, citations));
    }

    /**
     * Each chunk becomes a numbered block:
     *
     * [1] src/main/App.java (lines 10-42)
     * ```java
     * ...code...
     * ```
     *
     * The number matches the citation's position so the model can cite [n].
     */
    private String buildContextText(List<Document> documents, List<CitationDto> citations){
        StringBuilder sb = new StringBuilder();
        for(int i = 0; i < documents.size(); i++){
            CitationDto citation = citations.get(i);
            String text = documents.get(i).getText();

            sb.append('[').append(i + 1).append("] ")
              .append(citationMapper.label(citation))
              .append('\n')
              .append("```").append(fenceLanguage(citation.language())).append('\n')
              .append(text == null ? "" : text.strip())
              .append("\n```\n\n");
        }
        return sb.toString().strip();
    }

    private static String fenceLanguage(String language){
        return language == null ? "" : language.toLowerCase().replace(' ', '-');
    }

    private static RetrievedContext empty(){
        return new RetrievedContext(List.of(), NO_MATCHES);
    }
}
