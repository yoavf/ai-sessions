/**
 * Utilities for parsing Codex apply_patch tool format
 */

export interface ParsedFile {
  filePath: string;
  oldString: string;
  newString: string;
}

/**
 * Processes a single line from a unified diff format
 * @param line - The line to process (may start with +, -, or space)
 * @param oldLines - Array to append old version lines to
 * @param newLines - Array to append new version lines to
 */
function processLine(
  line: string,
  oldLines: string[],
  newLines: string[],
): void {
  if (line.startsWith("-")) {
    // Removed line - only in old
    oldLines.push(line.substring(1));
  } else if (line.startsWith("+")) {
    // Added line - only in new
    newLines.push(line.substring(1));
  } else if (line.length > 0) {
    // Context line - in both (or line starting with space)
    const content = line.startsWith(" ") ? line.substring(1) : line;
    oldLines.push(content);
    newLines.push(content);
  }
}

/**
 * Parses Codex apply_patch format and returns parsed file information
 *
 * Supports two Codex patch formats:
 * 1. "Add File" - For new files (old_string is empty)
 * 2. "Update File" - For modifications (contains @@ chunks with +/- lines)
 *
 * @param patch - The patch content from Codex apply_patch tool
 * @returns Array of parsed files with old and new content
 */
export function parsePatch(patch: string): ParsedFile[] {
  try {
    // Extract content between *** Begin Patch and *** End Patch
    const patchMatch = patch.match(
      /\*\*\* Begin Patch\n([\s\S]*?)\n\*\*\* End Patch/,
    );
    if (!patchMatch) return [];

    const patchBody = patchMatch[1];

    // Check if it's an "Add File" (no old content)
    const addFileMatch = patchBody.match(/\*\*\* Add File: (.+?)\n([\s\S]*)/);
    if (addFileMatch) {
      const filePath = addFileMatch[1];
      const content = addFileMatch[2];

      // For new files, old_string is empty
      const newString = content
        .split("\n")
        .filter((line) => line.startsWith("+"))
        .map((line) => line.substring(1))
        .join("\n");

      return [
        {
          filePath,
          oldString: "",
          newString,
        },
      ];
    }

    // Check if it's an "Update File" (Codex's custom format with @@ markers)
    const updateFileMatch = patchBody.match(
      /\*\*\* Update File: (.+?)\n([\s\S]*)/,
    );
    if (updateFileMatch) {
      const filePath = updateFileMatch[1];
      const content = updateFileMatch[2];

      // Parse the @@ chunks manually
      const oldLines: string[] = [];
      const newLines: string[] = [];

      // Split by @@ markers to get chunks
      const chunks = content.split(/@@[\s\S]*?@@/);

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        const lines = chunk.split("\n");
        for (const line of lines) {
          processLine(line, oldLines, newLines);
        }
      }

      return [
        {
          filePath,
          oldString: oldLines.join("\n"),
          newString: newLines.join("\n"),
        },
      ];
    }

    // No recognized format found
    return [];
  } catch (error) {
    console.error("Failed to parse patch:", error);
    return [];
  }
}
