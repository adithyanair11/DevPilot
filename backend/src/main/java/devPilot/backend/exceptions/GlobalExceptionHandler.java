package devPilot.backend.exceptions;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

@RestControllerAdvice 
public class GlobalExceptionHandler {
    
    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<Map<String,Object>> handleNotFound(NotFoundException ex){
        return error(HttpStatus.NOT_FOUND,ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<Map<String,Object>> handleBadRequest(BadRequestException ex){
        return error(HttpStatus.BAD_REQUEST,ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    ResponseEntity<Map<String,Object>> handleUnauthorized(UnauthorizedException ex){
        return error(HttpStatus.UNAUTHORIZED,ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex){
        String message = ex.getBindingResult().getFieldErrors().stream()
        .findFirst()
        .map(err -> err.getField() + ": " + err.getDefaultMessage())
        .orElse("Validation failed");
        
        return error(HttpStatus.BAD_REQUEST, message);
    }

    /** Errors returned by the GitHub API (RestClient). */
    @ExceptionHandler(RestClientResponseException.class)
    ResponseEntity<Map<String, Object>> handleGithubError(RestClientResponseException ex){
        int status = ex.getStatusCode().value();
        String remaining = ex.getResponseHeaders() != null
                ? ex.getResponseHeaders().getFirst("X-RateLimit-Remaining")
                : null;

        if (status == 429 || (status == 403 && "0".equals(remaining))) {
            return error(HttpStatus.TOO_MANY_REQUESTS,
                    "GitHub API rate limit exceeded. Please try again in a few minutes.");
        }
        if (status == 401) {
            return error(HttpStatus.UNAUTHORIZED,
                    "GitHub access has expired or was revoked. Please sign in again.");
        }
        if (status == 403) {
            return error(HttpStatus.FORBIDDEN, "GitHub denied access to this resource.");
        }
        if (status == 404) {
            return error(HttpStatus.NOT_FOUND, "Not found on GitHub.");
        }
        return error(HttpStatus.BAD_GATEWAY, "GitHub request failed (" + status + ").");
    }

    /** GitHub could not be reached at all (DNS, timeout, connection refused). */
    @ExceptionHandler(ResourceAccessException.class)
    ResponseEntity<Map<String, Object>> handleGithubUnreachable(ResourceAccessException ex){
        return error(HttpStatus.BAD_GATEWAY, "Couldn't reach GitHub. Please try again.");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage() != null ? ex.getMessage() : "Unexpected error");
    }


    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message){
        return ResponseEntity.status(status).body(Map.of(
            "status", status.value(),
            "error", status.getReasonPhrase(),
            "message", message,
            "timestamp", Instant.now().toString()
        ));
    }
}
