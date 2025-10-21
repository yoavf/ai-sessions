"use client";

import parseDiff from "parse-diff";
import DiffView from "./DiffView";

interface PatchDiffViewProps {
  patchContent: string;
}

/**
 * Parses Codex apply_patch format and renders using DiffView
 */
export default function PatchDiffView({ patchContent }: PatchDiffViewProps) {
  // Parse the patch format from Codex
  const parsePatch = (
    patch: string,
  ): Array<{ filePath: string; oldString: string; newString: string }> => {
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
            if (line.startsWith("-")) {
              // Removed line - only in old
              oldLines.push(line.substring(1));
            } else if (line.startsWith("+")) {
              // Added line - only in new
              newLines.push(line.substring(1));
            } else if (line.length > 0) {
              // Context line - in both
              oldLines.push(line);
              newLines.push(line);
            }
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

      // Fallback: Try to parse as standard unified diff format
      const files = parseDiff(patchBody);

      return files.map((file) => {
        const filePath = file.to || file.from || "unknown";

        // Reconstruct old and new content from chunks
        let oldLines: string[] = [];
        let newLines: string[] = [];

        for (const chunk of file.chunks) {
          for (const change of chunk.changes) {
            if (change.type === "del") {
              oldLines.push(change.content.substring(1)); // Remove leading '-'
            } else if (change.type === "add") {
              newLines.push(change.content.substring(1)); // Remove leading '+'
            } else {
              // Normal/unchanged line
              oldLines.push(change.content.substring(1)); // Remove leading ' '
              newLines.push(change.content.substring(1));
            }
          }
        }

        return {
          filePath,
          oldString: oldLines.join("\n"),
          newString: newLines.join("\n"),
        };
      });
    } catch (error) {
      console.error("Failed to parse patch:", error);
      return [];
    }
  };

  const parsedFiles = parsePatch(patchContent);

  if (parsedFiles.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Unable to parse patch format
      </div>
    );
  }

  return (
    <>
      {parsedFiles.map((file, idx) => (
        <DiffView
          key={idx}
          filePath={file.filePath}
          oldString={file.oldString}
          newString={file.newString}
        />
      ))}
    </>
  );
}
