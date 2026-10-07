package devPilot.backend.services.ai;

import java.util.List;

import org.springframework.ai.document.Document;
import org.springframework.stereotype.Component;

import devPilot.backend.dto.CitationDto;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

/**
 * Turns retrieved vector-store documents into {@link CitationDto}s that point
 * back to the source file and line range.
 */
@Component 
@RequiredArgsConstructor 
public class CitationMapper {
    private final JsonMapper jsonMapper;

    public CitationDto fromDocument(Document document){
        var meta = document.getMetadata();
        return new CitationDto(
            stringVal(meta.get("filePath")),
            intVal(meta.get("startLine")),
            intVal(meta.get("endLine")),
            stringVal(meta.get("language"))
        );
    }

    /** One citation per document, in the same order, so [n] in the prompt matches citations.get(n - 1). */
    public List<CitationDto> fromDocuments(List<Document> documents){
        if(documents == null || documents.isEmpty()){
            return List.of();
        }
        return documents.stream().map(this::fromDocument).toList();
    }

    /** Serialises citations for the client (e.g. an SSE "citations" event). */
    public String toJson(List<CitationDto> citations){
        return jsonMapper.writeValueAsString(citations == null ? List.of() : citations);
    }

    /** Human-readable label used in the prompt context, e.g. "src/App.java (lines 10-42)". */
    public String label(CitationDto citation){
        String path = citation.filePath() != null ? citation.filePath() : "unknown file";
        Integer start = citation.startLine();
        Integer end = citation.endLine();

        if(start != null && end != null){
            return start.equals(end)
                    ? path + " (line " + start + ")"
                    : path + " (lines " + start + "-" + end + ")";
        }
        if(start != null){
            return path + " (from line " + start + ")";
        }
        return path;
    }

    // Metadata comes back from pgvector as JSON, so numbers may be Integer,
    // Long, Double or even String depending on how they were stored.

    private static String stringVal(Object value){
        if(value == null){
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() || "null".equalsIgnoreCase(s) ? null : s;
    }

    private static Integer intVal(Object value){
        if(value == null){
            return null;
        }
        if(value instanceof Number number){
            return number.intValue();
        }
        try{
            String s = String.valueOf(value).trim();
            return s.isEmpty() ? null : (int) Double.parseDouble(s);
        }catch(NumberFormatException ex){
            return null;
        }
    }
}
