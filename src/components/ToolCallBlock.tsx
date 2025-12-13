"use client";

import { CheckCircleIcon, WrenchIcon } from "lucide-react";
import { useState } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@/components/ai-elements/tool";
import { Badge } from "@/components/ui/badge";
import type { ToolResult, ToolUse } from "@/types/transcript";
import DiffView from "./DiffView";
import { getToolPreview } from "./getToolPreview";
import PatchDiffView from "./PatchDiffView";
import TodoListBlock from "./TodoListBlock";

/**
 * Parse Mistral Vibe's search_replace content format into diff blocks
 * Format: <<<<<<< SEARCH\n[old]\n=======\n[new]\n>>>>>>> REPLACE
 */
function parseSearchReplaceBlocks(
  content: string,
): Array<{ oldText: string; newText: string }> {
  const blocks: Array<{ oldText: string; newText: string }> = [];
  // Handle trailing whitespace on marker lines and flexible newlines
  const pattern =
    /<<<<<<< SEARCH[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*=======[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*>>>>>>> REPLACE/g;

  for (const match of content.matchAll(pattern)) {
    blocks.push({
      oldText: match[1],
      newText: match[2],
    });
  }

  return blocks;
}

interface ToolCallBlockProps {
  toolUse: ToolUse;
  toolResults?: ToolResult[];
  cwd?: string;
}

/**
 * Renders a list of tool results with metadata support
 */
function ToolResultsList({ results }: { results: ToolResult[] }) {
  return (
    <>
      {results.map((result) => (
        <div key={result.tool_use_id} className="space-y-2 p-4">
          <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-2">
            <span>{result.is_error ? "Error" : "Result"}</span>
            {result.metadata?.duration_seconds !== undefined &&
              result.metadata.duration_seconds > 0 && (
                <span className="text-[10px] opacity-60 font-normal normal-case">
                  ({result.metadata.duration_seconds}s)
                </span>
              )}
          </h4>
          <div className="overflow-x-auto rounded-md bg-muted/50 text-foreground text-xs">
            <pre className="whitespace-pre-wrap p-2 font-mono">
              {result.content}
            </pre>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Normalize todo list data from different providers into a common format
 */
function normalizeTodoList(
  toolName: string,
  // biome-ignore lint/suspicious/noExplicitAny: Tool input types are dynamic
  input: Record<string, any>,
): Array<{
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}> | null {
  // Claude Code: TodoWrite
  if (toolName === "TodoWrite" && input.todos && Array.isArray(input.todos)) {
    return input.todos;
  }

  // Mistral Vibe: todo
  if (toolName === "todo" && input.todos && Array.isArray(input.todos)) {
    return input.todos.map(
      (item: { id?: string; content: string; status?: string }) => ({
        content: item.content,
        status: (item.status || "pending") as
          | "pending"
          | "in_progress"
          | "completed",
        activeForm: item.content,
      }),
    );
  }

  // Codex: update_plan
  if (toolName === "update_plan" && input.plan && Array.isArray(input.plan)) {
    return input.plan.map((item: { step: string; status: string }) => ({
      content: item.step,
      status: item.status as "pending" | "in_progress" | "completed",
      activeForm: item.step,
    }));
  }

  return null;
}
export default function ToolCallBlock({
  toolUse,
  toolResults = [],
  cwd,
}: ToolCallBlockProps) {
  const todoList = normalizeTodoList(toolUse.name, toolUse.input);
  const isTodoList = todoList !== null;

  const filePath = toolUse.input.file_path || toolUse.input.path;

  // Claude Code "Edit", Gemini "replace"
  const isEdit =
    (toolUse.name === "Edit" || toolUse.name === "replace") &&
    filePath !== undefined &&
    (toolUse.input.old_string !== undefined ||
      toolUse.input.old_text !== undefined) &&
    (toolUse.input.new_string !== undefined ||
      toolUse.input.new_text !== undefined);

  // Mistral Vibe "search_replace" uses SEARCH/REPLACE blocks in content
  const isSearchReplace =
    toolUse.name === "search_replace" &&
    filePath !== undefined &&
    typeof toolUse.input.content === "string" &&
    toolUse.input.content.includes("<<<<<<< SEARCH");

  const searchReplaceBlocks = isSearchReplace
    ? parseSearchReplaceBlocks(toolUse.input.content)
    : [];

  // Claude Code "Write", Gemini/Mistral Vibe "write_file"
  const isWrite =
    (toolUse.name === "Write" || toolUse.name === "write_file") &&
    filePath !== undefined &&
    toolUse.input.content !== undefined;

  // Codex "apply_patch"
  const isApplyPatch =
    toolUse.name === "apply_patch" &&
    toolUse.input.input &&
    typeof toolUse.input.input === "string";

  const [isOpen, setIsOpen] = useState(
    isTodoList || isEdit || isWrite || isApplyPatch || isSearchReplace,
  );
  const preview = getToolPreview(toolUse.name, toolUse.input, cwd);
  const isShellLikeTool = toolUse.name === "shell" || toolUse.name === "bash";

  const getTitle = () => {
    // Shell tools: show command directly without tool name prefix
    if (isShellLikeTool && preview) {
      return preview;
    }
    return preview ? `${toolUse.name}: ${preview}` : toolUse.name;
  };

  if (isTodoList) {
    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={getTitle()}
          type="tool-call"
          state="output-available"
          className={isShellLikeTool ? "[&_span]:font-mono" : undefined}
        />
        <ToolContent>
          <div className="p-4 space-y-3">
            <TodoListBlock todos={todoList} />
          </div>
          <ToolResultsList results={toolResults} />
        </ToolContent>
      </Tool>
    );
  }

  if (isEdit || isWrite) {
    const displayFilePath = toolUse.input.file_path || toolUse.input.path;
    const oldString = isEdit
      ? toolUse.input.old_string || toolUse.input.old_text || ""
      : "";
    const newString = isEdit
      ? toolUse.input.new_string || toolUse.input.new_text || ""
      : toolUse.input.content;

    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={getTitle()}
          type="tool-call"
          state="output-available"
        />
        <ToolContent>
          <DiffView
            filePath={displayFilePath}
            oldString={oldString}
            newString={newString}
            cwd={cwd}
          />
          <ToolResultsList results={toolResults} />
        </ToolContent>
      </Tool>
    );
  }

  if (isApplyPatch) {
    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={getTitle()}
          type="tool-call"
          state="output-available"
        />
        <ToolContent>
          <PatchDiffView patchContent={toolUse.input.input} cwd={cwd} />
          <ToolResultsList results={toolResults} />
        </ToolContent>
      </Tool>
    );
  }

  if (isSearchReplace) {
    const displayFilePath = toolUse.input.file_path || toolUse.input.path;
    if (searchReplaceBlocks.length > 0) {
      return (
        <Tool open={isOpen} onOpenChange={setIsOpen}>
          <ToolHeader
            title={getTitle()}
            type="tool-call"
            state="output-available"
          />
          <ToolContent>
            {searchReplaceBlocks.map((block, index) => (
              <DiffView
                key={index}
                filePath={displayFilePath}
                oldString={block.oldText}
                newString={block.newText}
                cwd={cwd}
              />
            ))}
            <ToolResultsList results={toolResults} />
          </ToolContent>
        </Tool>
      );
    }
    // Malformed search_replace content - show raw content with warning
    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={getTitle()}
          type="tool-call"
          state="output-available"
        />
        <ToolContent>
          <div className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Could not parse SEARCH/REPLACE blocks
            </p>
            <pre className="whitespace-pre-wrap text-xs font-mono bg-muted/50 p-2 rounded-md overflow-x-auto">
              {toolUse.input.content}
            </pre>
          </div>
          <ToolResultsList results={toolResults} />
        </ToolContent>
      </Tool>
    );
  }

  // Only show parameters if >1 arg (single args already in header preview)
  const inputKeys = Object.keys(toolUse.input || {});
  const showParameters = inputKeys.length > 1;
  const hasExpandableContent = showParameters || toolResults.length > 0;

  if (!hasExpandableContent) {
    return (
      <div className="not-prose mb-4 w-full rounded-md border">
        <div className="flex w-full items-center gap-4 p-3">
          <div className="flex items-center gap-2">
            <WrenchIcon className="size-4 text-muted-foreground" />
            <span
              className={`font-medium text-sm ${isShellLikeTool ? "font-mono" : ""}`}
            >
              {getTitle()}
            </span>
            <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
              <CheckCircleIcon className="size-4 text-green-600" />
              Completed
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tool open={isOpen} onOpenChange={setIsOpen}>
      <ToolHeader
        title={getTitle()}
        type="tool-call"
        state="output-available"
        className={isShellLikeTool ? "[&_span]:font-mono" : undefined}
      />
      <ToolContent>
        {showParameters && <ToolInput input={toolUse.input} cwd={cwd} />}
        <ToolResultsList results={toolResults} />
      </ToolContent>
    </Tool>
  );
}
