"use client";

import { useState } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@/components/ai-elements/tool";
import type { ToolResult, ToolUse } from "@/types/transcript";
import DiffView from "./DiffView";
import { getToolPreview } from "./getToolPreview";
import PatchDiffView from "./PatchDiffView";
import TodoListBlock from "./TodoListBlock";

interface ToolCallBlockProps {
  toolUse: ToolUse;
  toolResults?: ToolResult[];
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
  // Claude Code format: TodoWrite with todos array
  if (toolName === "TodoWrite" && input.todos && Array.isArray(input.todos)) {
    return input.todos;
  }

  // Codex format: update_plan with plan array
  if (toolName === "update_plan" && input.plan && Array.isArray(input.plan)) {
    return input.plan.map((item: { step: string; status: string }) => ({
      content: item.step,
      status: item.status as "pending" | "in_progress" | "completed",
      activeForm: item.step, // Codex doesn't have activeForm, use step as fallback
    }));
  }

  return null;
}
export default function ToolCallBlock({
  toolUse,
  toolResults = [],
}: ToolCallBlockProps) {
  // Normalize todo list data from both TodoWrite and update_plan
  const todoList = normalizeTodoList(toolUse.name, toolUse.input);
  const isTodoList = todoList !== null;

  // Edit tools should be expanded by default to show the diff
  // Support both Claude Code's "Edit" and Gemini's "replace" tools
  const isEdit =
    (toolUse.name === "Edit" || toolUse.name === "replace") &&
    toolUse.input.file_path !== undefined &&
    toolUse.input.old_string !== undefined &&
    toolUse.input.new_string !== undefined;

  // Write tool should show diff view (treating it as a new file)
  // Support both Claude Code's "Write" and Gemini's "write_file" tools
  const isWrite =
    (toolUse.name === "Write" || toolUse.name === "write_file") &&
    toolUse.input.file_path !== undefined &&
    toolUse.input.content !== undefined;

  // Codex apply_patch tool
  const isApplyPatch =
    toolUse.name === "apply_patch" &&
    toolUse.input.input &&
    typeof toolUse.input.input === "string";

  const [isOpen, setIsOpen] = useState(
    isTodoList || isEdit || isWrite || isApplyPatch,
  );
  const preview = getToolPreview(toolUse.name, toolUse.input);

  // For shell tool, show just the command without the "shell:" prefix
  const getTitle = () => {
    if (toolUse.name === "shell" && preview) {
      return preview;
    }
    return preview ? `${toolUse.name}: ${preview}` : toolUse.name;
  };

  // Special handling for todo lists - show visual todo list instead of JSON
  if (isTodoList) {
    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={getTitle()}
          type="tool-call"
          state="output-available"
          className={
            toolUse.name === "shell" ? "[&_span]:font-mono" : undefined
          }
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

  // Special handling for Edit and Write - show diff view instead of JSON
  if (isEdit || isWrite) {
    const filePath = toolUse.input.file_path;
    const oldString = isEdit ? toolUse.input.old_string : "";
    const newString = isEdit ? toolUse.input.new_string : toolUse.input.content;

    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={getTitle()}
          type="tool-call"
          state="output-available"
        />
        <ToolContent>
          <DiffView
            filePath={filePath}
            oldString={oldString}
            newString={newString}
          />
          <ToolResultsList results={toolResults} />
        </ToolContent>
      </Tool>
    );
  }

  // Special handling for Codex apply_patch - parse and show diff
  if (isApplyPatch) {
    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={getTitle()}
          type="tool-call"
          state="output-available"
        />
        <ToolContent>
          <PatchDiffView patchContent={toolUse.input.input} />
          <ToolResultsList results={toolResults} />
        </ToolContent>
      </Tool>
    );
  }

  return (
    <Tool open={isOpen} onOpenChange={setIsOpen}>
      <ToolHeader
        title={getTitle()}
        type="tool-call"
        state="output-available"
        className={toolUse.name === "shell" ? "[&_span]:font-mono" : undefined}
      />
      <ToolContent>
        <ToolInput input={toolUse.input} />
        <ToolResultsList results={toolResults} />
      </ToolContent>
    </Tool>
  );
}
