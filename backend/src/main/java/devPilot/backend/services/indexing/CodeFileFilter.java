package devPilot.backend.services.indexing;

import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

@Component
public class CodeFileFilter {

    private static final Set<String> SKIP_DIR_PARTS = Set.of(
            "node_modules",
            ".git",
            "dist",
            "build",
            "target",
            ".next",
            "vendor",
            "__pycache__",
            ".idea",
            "vscode",
            "coverage",
            "out");

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "java", "kt", "kts", "scala",
            "ts", "tsx", "js", "jsx", "mjs", "cjs",
            "py", "go", "rs", "rb", "php",
            "c", "h", "cpp", "hpp", "cs",
            "swift", "m", "mm", "md", "mdx", "txt",
            "yml", "yaml", "json", "toml", "xml",
            "properties", "gradle", "sql", "sh", "bash",
            "zsh", "dockerfile", "makefile", "html", "css",
            "scss", "sass", "vue", "svelte");

    private static final Set<String> SKIP_FILENAMES = Set.of(
            "package.json",
            "yarn.lock",
            "pnpm.lock.yaml",
            "composer.lock",
            "cargo.lock",
            "poetry.lock");

    public boolean isEligible(
            String path,
            long sizeBytes,
            long maxFileBytes) {

        if (path == null || path.isBlank()) {
            return false;
        }

        if (sizeBytes < 0 || sizeBytes > maxFileBytes) {
            return false;
        }

        String normalizedPath = path
                .replace('\\', '/')
                .trim();

        String lowerPath = normalizedPath.toLowerCase(Locale.ROOT);

        // Skip directories such as node_modules, .git, target, etc.
        for (String skipDir : SKIP_DIR_PARTS) {
            if (lowerPath.equals(skipDir)
                    || lowerPath.startsWith(skipDir + "/")
                    || lowerPath.contains("/" + skipDir + "/")) {
                return false;
            }
        }

        // Get just the filename.
        int lastSlash = normalizedPath.lastIndexOf('/');
        String fileName = lastSlash >= 0
                ? normalizedPath.substring(lastSlash + 1)
                : normalizedPath;

        String lowerFileName = fileName.toLowerCase(Locale.ROOT);

        // Skip known dependency/lock files.
        if (SKIP_FILENAMES.contains(lowerFileName)) {
            return false;
        }

        // Handle extensionless files such as Dockerfile and Makefile.
        if (ALLOWED_EXTENSIONS.contains(lowerFileName)) {
            return true;
        }

        // Find the file extension.
        int lastDot = lowerFileName.lastIndexOf('.');

        if (lastDot <= 0 || lastDot == lowerFileName.length() - 1) {
            return false;
        }

        String extension = lowerFileName.substring(lastDot + 1);

        return ALLOWED_EXTENSIONS.contains(extension);
    }

    public String detectLanguage(String path){
        String lower = path.toLowerCase(Locale.ROOT);
        String fileName = lower.substring(lower.lastIndexOf('/') + 1);
        if("dockerfile".equals(fileName)){
            return "dockerfile";
        }

        if("makefile".equals(fileName)){
            return "makefile";
        }

        int dot = fileName.lastIndexOf('.');
        if(dot < 0){
            return "text";
        }

        return fileName.substring(dot + 1);
    }
}
