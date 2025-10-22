"use client";

import { useState } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@/components/ai-elements/tool";
import type { ToolResult, ToolUse } from "@/types/transcript";
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

function getToolPreview(
  toolName: string,
  // biome-ignore lint/suspicious/noExplicitAny: Tool input types are dynamic
  input: Record<string, any>,
): string | null {
  switch (toolName) {
    case "Read":
      return input.file_path || null;

    case "Write":
    case "Edit":
      return input.file_path || null;

    case "Glob":
      return input.pattern || null;

    case "Grep":
      return input.pattern ? `"${input.pattern}"` : null;

    case "Bash": {
      if (!input.command) return null;
      const cmd = input.command as string;

      // Extract the main command (first meaningful token)
      const trimmed = cmd.trim();

      // Handle common patterns
      if (trimmed.startsWith("npx ")) {
        const match = trimmed.match(/^npx\s+([^\s]+)/);
        return match ? `npx ${match[1]}` : "npx";
      }

      if (trimmed.startsWith("npm ")) {
        const match = trimmed.match(/^npm\s+(run\s+)?([^\s]+)/);
        return match
          ? match[1]
            ? `npm run ${match[2]}`
            : `npm ${match[2]}`
          : "npm";
      }

      // For other commands, get first ~50 chars or until &&, ||, |, ;
      const breakPoints = /[&|;]/;
      const breakIndex = cmd.search(breakPoints);
      const displayCmd =
        breakIndex !== -1 ? cmd.substring(0, breakIndex).trim() : cmd;

      return displayCmd.length > 50
        ? `${displayCmd.substring(0, 50)}...`
        : displayCmd;
    }

    case "WebFetch":
      return input.url || null;

    case "Task":
      return input.description || null;

    case "SlashCommand":
      return input.command || null;

    case "TodoWrite":
      if (input.todos && Array.isArray(input.todos)) {
        return `${input.todos.length} todo${input.todos.length !== 1 ? "s" : ""}`;
      }
      return null;

    case "update_plan":
      if (input.plan && Array.isArray(input.plan)) {
        return `${input.plan.length} step${input.plan.length !== 1 ? "s" : ""}`;
      }
      return null;

    case "shell": {
      // Codex shell tool
      if (!input.command) return null;

      // Parse command - it's usually an array like ["bash", "-lc", "actual command"]
      let actualCommand: string;
      if (Array.isArray(input.command)) {
        // Skip "bash", "-lc" and get the actual command
        const filtered = input.command.filter(
          (arg: string) => arg !== "bash" && arg !== "-lc",
        );
        actualCommand = filtered.join(" ");
      } else if (typeof input.command === "string") {
        actualCommand = input.command;
      } else {
        return null;
      }

      // Get first line if multiline
      const firstLine = actualCommand.trim().split("\n")[0];

      // For commands, get first ~60 chars or until &&, ||, |, ;
      const breakPoints = /[&|;]/;
      const breakIndex = firstLine.search(breakPoints);
      const displayCmd =
        breakIndex !== -1
          ? firstLine.substring(0, breakIndex).trim()
          : firstLine;

      return displayCmd.length > 60
        ? `${displayCmd.substring(0, 60)}...`
        : displayCmd;
    }

    default: {
      // For unknown tools, try to find a likely preview field
      const previewFields = [
        "path",
        "file_path",
        "pattern",
        "query",
        "command",
        "description",
      ];
      for (const field of previewFields) {
        if (input[field] && typeof input[field] === "string") {
          return input[field];
        }
      }
      return null;
    }
  }
}

/**
 * Normalize todo list data from different providers into a common format
 */
function normalizeTodoList(
  toolName: string,
  // biome-ignore lint/suspicious/noExplicitAny: Tool input types are dynamic
  input: Record<string, any>,
):
  | Array<{ content: string; status: "pending" | "in_progress" | "completed"; activeForm: string }>
  | null {
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

  const [isOpen, setIsOpen] = useState(isTodoList);
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
