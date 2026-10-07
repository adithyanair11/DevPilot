package devPilot.backend.services.ai;

public final class RagSettings {
    public static final int TOP_K_CHUNKS = 8;
    public static final long STREAM_TIMEOUT_MS = 100_000L;

    /** Prior messages (user + assistant) sent to the model as conversation history. */
    public static final int HISTORY_MESSAGES = 6;
    public static final int MAX_QUESTION_LENGTH = 2000;
    

   public static final String METADATA_REPO_ID = "repoId";

   private RagSettings(){

   }
}
