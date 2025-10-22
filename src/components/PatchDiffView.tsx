"use client";

import { parsePatch } from "@/lib/parsePatch";
import DiffView from "./DiffView";

interface PatchDiffViewProps {
  patchContent: string;
  cwd?: string;
}

/**
 * Parses Codex apply_patch format and renders using DiffView
 */
export default function PatchDiffView({
  patchContent,
  cwd,
}: PatchDiffViewProps) {
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
          cwd={cwd}
        />
      ))}
    </>
  );
}
