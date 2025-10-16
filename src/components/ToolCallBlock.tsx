"use client";

import { useState } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { ToolResult, ToolUse } from "@/types/transcript";
import TodoListBlock from "./TodoListBlock";

interface ToolCallBlockProps {
  toolUse: ToolUse;
  toolResults?: ToolResult[];
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

export default function ToolCallBlock({
  toolUse,
  toolResults = [],
}: ToolCallBlockProps) {
  // TodoWrite should be expanded by default to show the todo list
  const isTodoWrite =
    toolUse.name === "TodoWrite" &&
    toolUse.input.todos &&
    Array.isArray(toolUse.input.todos);
  const [isOpen, setIsOpen] = useState(isTodoWrite);
  const preview = getToolPreview(toolUse.name, toolUse.input);

  // Special handling for TodoWrite - show visual todo list instead of JSON
  if (isTodoWrite) {
    return (
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          title={preview ? `${toolUse.name}: ${preview}` : toolUse.name}
          type="tool-call"
          state="output-available"
        />
        <ToolContent>
          <div className="p-4 space-y-3">
            <TodoListBlock todos={toolUse.input.todos} />
          </div>
          {toolResults.map((result) => (
            <ToolOutput
              key={result.tool_use_id}
              output={result.content}
              errorText={result.is_error ? "Tool execution failed" : undefined}
            />
          ))}
        </ToolContent>
      </Tool>
    );
  }

  return (
    <Tool open={isOpen} onOpenChange={setIsOpen}>
      <ToolHeader
        title={preview ? `${toolUse.name}: ${preview}` : toolUse.name}
        type="tool-call"
        state="output-available"
      />
      <ToolContent>
        <ToolInput input={toolUse.input} />
        {toolResults.map((result) => (
          <ToolOutput
            key={result.tool_use_id}
            output={result.content}
            errorText={result.is_error ? "Tool execution failed" : undefined}
          />
        ))}
      </ToolContent>
    </Tool>
  );
}
