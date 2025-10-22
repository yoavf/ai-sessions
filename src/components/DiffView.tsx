"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ai-elements/code-block";

interface DiffViewProps {
  filePath: string;
  oldString: string;
  newString: string;
}

type DiffMode = "split" | "unified";

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Map of file extensions to language identifiers for syntax highlighting
 */
const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  php: "php",
  md: "markdown",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  css: "css",
  scss: "scss",
  html: "html",
  xml: "xml",
  sql: "sql",
  sh: "bash",
  bash: "bash",
};

/**
 * Displays a diff view for Edit tool calls with toggle between split and unified views
 */
export default function DiffView({
  filePath,
  oldString,
  newString,
}: DiffViewProps) {
  // Default to unified view for new files (when oldString is empty)
  const isNewFile = oldString === "";
  const [mode, setMode] = useState<DiffMode>(isNewFile ? "unified" : "split");

  // Detect language from file extension
  const getLanguage = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase();
    return LANGUAGE_MAP[ext || ""] || "text";
  };

  // Simple diff algorithm - finds added and removed lines
  const computeDiff = (oldStr: string, newStr: string): DiffLine[] => {
    const oldLines = oldStr.split("\n");
    const newLines = newStr.split("\n");
    const diff: DiffLine[] = [];

    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];

      if (oldLine === newLine) {
        // Lines match - unchanged
        diff.push({
          type: "unchanged",
          content: oldLine || "",
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
        });
        oldIndex++;
        newIndex++;
      } else {
        // Lines differ - check if it's a removal, addition, or both
        const oldLineInNew = newLines.slice(newIndex).indexOf(oldLine);
        const newLineInOld = oldLines.slice(oldIndex).indexOf(newLine);

        if (oldLineInNew === -1 && newLineInOld === -1) {
          // Both lines are unique - mark as removed and added
          if (oldIndex < oldLines.length) {
            diff.push({
              type: "removed",
              content: oldLine || "",
              oldLineNumber: oldIndex + 1,
            });
            oldIndex++;
          }
          if (newIndex < newLines.length) {
            diff.push({
              type: "added",
              content: newLine || "",
              newLineNumber: newIndex + 1,
            });
            newIndex++;
          }
        } else if (
          oldLineInNew !== -1 &&
          (newLineInOld === -1 || oldLineInNew <= newLineInOld)
        ) {
          // Old line appears later in new - mark intervening new lines as added
          while (newLines[newIndex] !== oldLine) {
            diff.push({
              type: "added",
              content: newLines[newIndex] || "",
              newLineNumber: newIndex + 1,
            });
            newIndex++;
          }
        } else {
          // New line appears later in old - mark intervening old lines as removed
          while (oldLines[oldIndex] !== newLine) {
            diff.push({
              type: "removed",
              content: oldLines[oldIndex] || "",
              oldLineNumber: oldIndex + 1,
            });
            oldIndex++;
          }
        }
      }
    }

    return diff;
  };

  const language = getLanguage(filePath);
  const diffLines = computeDiff(oldString, newString);

  return (
    <div className="space-y-3 p-4">
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Edit {filePath}
      </h4>

      {mode === "split" ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Before (old_string) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <span className="text-xs font-medium text-muted-foreground">
                Before
              </span>
            </div>
            <div className="rounded-md overflow-hidden border border-red-500/30">
              <div className="font-mono text-xs">
                {diffLines
                  .filter((line) => line.type !== "added")
                  .map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        line.type === "removed" ? "bg-red-500/10" : ""
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 px-2 py-1 text-muted-foreground text-right select-none border-r">
                        {line.oldLineNumber}
                      </div>
                      <div className="flex-shrink-0 w-6 px-1 py-1 text-center select-none">
                        {line.type === "removed" ? (
                          <span className="text-red-600">-</span>
                        ) : (
                          <span className="text-muted-foreground/30"> </span>
                        )}
                      </div>
                      <pre className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                        {line.content}
                      </pre>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* After (new_string) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              <span className="text-xs font-medium text-muted-foreground">
                After
              </span>
            </div>
            <div className="rounded-md overflow-hidden border border-green-500/30">
              <div className="font-mono text-xs">
                {diffLines
                  .filter((line) => line.type !== "removed")
                  .map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        line.type === "added" ? "bg-green-500/10" : ""
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 px-2 py-1 text-muted-foreground text-right select-none border-r">
                        {line.newLineNumber}
                      </div>
                      <div className="flex-shrink-0 w-6 px-1 py-1 text-center select-none">
                        {line.type === "added" ? (
                          <span className="text-green-600">+</span>
                        ) : (
                          <span className="text-muted-foreground/30"> </span>
                        )}
                      </div>
                      <pre className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                        {line.content}
                      </pre>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md overflow-hidden border bg-muted/50">
          <div className="font-mono text-xs">
            {diffLines.map((line, idx) => (
              <div
                key={idx}
                className={`flex ${
                  line.type === "added"
                    ? "bg-green-500/10"
                    : line.type === "removed"
                      ? "bg-red-500/10"
                      : ""
                }`}
              >
                <div className="flex-shrink-0 w-12 px-2 py-1 text-muted-foreground text-right select-none border-r">
                  {line.type === "removed"
                    ? line.oldLineNumber
                    : line.type === "added"
                      ? line.newLineNumber
                      : line.oldLineNumber}
                </div>
                <div className="flex-shrink-0 w-6 px-1 py-1 text-center select-none">
                  {line.type === "added" ? (
                    <span className="text-green-600">+</span>
                  ) : line.type === "removed" ? (
                    <span className="text-red-600">-</span>
                  ) : (
                    <span className="text-muted-foreground/30"> </span>
                  )}
                </div>
                <pre className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                  {line.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle controls at the bottom */}
      <div className="flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("split")}
          className={`px-2 py-1 rounded transition-colors ${
            mode === "split"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Split
        </button>
        <span className="text-muted-foreground/50">|</span>
        <button
          type="button"
          onClick={() => setMode("unified")}
          className={`px-2 py-1 rounded transition-colors ${
            mode === "unified"
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Unified
        </button>
      </div>
    </div>
  );
}
