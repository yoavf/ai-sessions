"use client";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import type {
  ContentBlock,
  Message,
  ToolResult,
  TranscriptLine,
} from "@/types/transcript";
import BashBlock from "./BashBlock";
import CodeBlock from "./CodeBlock";
import SlashCommandBlock from "./SlashCommandBlock";
import ToolCallBlock from "./ToolCallBlock";

interface MessageRendererProps {
  message: Message;
  isUser: boolean;
  childMessages?: TranscriptLine[];
}

export default function MessageRenderer({
  message,
  isUser,
  childMessages = [],
}: MessageRendererProps) {
  const content = message.content;

  if (typeof content === "string") {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <Response>{content}</Response>
      </div>
    );
  }

  // Group slash command blocks and bash blocks together
  const groupedContent: (
    | ContentBlock
    | {
        type: "slash-command";
        commandName: string;
        commandMessage?: string;
        commandArgs?: string;
      }
    | { type: "bash-block"; input?: string; stdout?: string; stderr?: string }
  )[] = [];
  let i = 0;

  while (i < content.length) {
    const block = content[i];

    if (block.type === "command-name") {
      // Look ahead for command-message and command-args
      const commandName = block.text;
      let commandMessage: string | undefined;
      let commandArgs: string | undefined;
      let j = i + 1;

      while (
        j < content.length &&
        (content[j].type === "command-message" ||
          content[j].type === "command-args")
      ) {
        if (content[j].type === "command-message") {
          // biome-ignore lint/suspicious/noExplicitAny: ContentBlock types are not fully typed
          commandMessage = (content[j] as any).text;
        } else if (content[j].type === "command-args") {
          // biome-ignore lint/suspicious/noExplicitAny: ContentBlock types are not fully typed
          commandArgs = (content[j] as any).text;
        }
        j++;
      }

      groupedContent.push({
        type: "slash-command",
        commandName,
        commandMessage,
        commandArgs,
      });
      i = j;
    } else if (block.type === "bash-input") {
      // Look ahead for bash-stdout and bash-stderr
      const input = block.text;
      let stdout: string | undefined;
      let stderr: string | undefined;
      let j = i + 1;

      while (
        j < content.length &&
        (content[j].type === "bash-stdout" || content[j].type === "bash-stderr")
      ) {
        if (content[j].type === "bash-stdout") {
          // biome-ignore lint/suspicious/noExplicitAny: ContentBlock types are not fully typed
          stdout = (content[j] as any).text;
        } else if (content[j].type === "bash-stderr") {
          // biome-ignore lint/suspicious/noExplicitAny: ContentBlock types are not fully typed
          stderr = (content[j] as any).text;
        }
        j++;
      }

      groupedContent.push({
        type: "bash-block",
        input,
        stdout,
        stderr,
      });
      i = j;
    } else if (block.type === "bash-stdout" || block.type === "bash-stderr") {
      // Handle standalone bash output (without input in same message)
      let stdout: string | undefined;
      let stderr: string | undefined;
      let j = i;

      while (
        j < content.length &&
        (content[j].type === "bash-stdout" || content[j].type === "bash-stderr")
      ) {
        if (content[j].type === "bash-stdout") {
          // biome-ignore lint/suspicious/noExplicitAny: ContentBlock types are not fully typed
          stdout = (content[j] as any).text;
        } else if (content[j].type === "bash-stderr") {
          // biome-ignore lint/suspicious/noExplicitAny: ContentBlock types are not fully typed
          stderr = (content[j] as any).text;
        }
        j++;
      }

      groupedContent.push({
        type: "bash-block",
        stdout,
        stderr,
      });
      i = j;
    } else {
      groupedContent.push(block);
      i++;
    }
  }

  return (
    <div className="space-y-4">
      {groupedContent.map((block, idx) => (
        <ContentBlockRenderer
          // biome-ignore lint/suspicious/noArrayIndexKey: Grouped content blocks don't have stable IDs
          key={idx}
          block={block}
          childMessages={childMessages}
        />
      ))}
    </div>
  );
}

function ContentBlockRenderer({
  block,
  childMessages = [],
}: {
  block:
    | ContentBlock
    | {
        type: "slash-command";
        commandName: string;
        commandMessage?: string;
        commandArgs?: string;
      }
    | { type: "bash-block"; input?: string; stdout?: string; stderr?: string };
  childMessages?: TranscriptLine[];
}) {
  switch (block.type) {
    case "text": {
      // Check if text looks like raw logs/code (contains many ===== lines, EVENT lines, or JSON-like content)
      const looksLikeRawContent =
        block.text.includes(
          "================================================================================",
        ) ||
        /^EVENT \[/.test(block.text) ||
        (/^\{[\s\S]*\}$/.test(block.text.trim()) && block.text.length > 100);

      if (looksLikeRawContent) {
        return (
          <div className="bg-muted/50 border rounded-lg p-4">
            <CodeBlock code={block.text} language="text" />
          </div>
        );
      }

      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <Response>{block.text}</Response>
        </div>
      );
    }

    case "thinking":
      return (
        <Reasoning defaultOpen={false}>
          <ReasoningTrigger />
          <ReasoningContent>{block.thinking}</ReasoningContent>
        </Reasoning>
      );

    case "tool_use": {
      // Find tool results for this specific tool use
      const toolResults = childMessages
        .filter(
          (child) => child.message && Array.isArray(child.message.content),
        )
        .flatMap((child) =>
          (child.message?.content as ContentBlock[]).filter(
            (contentBlock): contentBlock is ToolResult =>
              contentBlock.type === "tool_result" &&
              contentBlock.tool_use_id === block.id,
          ),
        );
      return <ToolCallBlock toolUse={block} toolResults={toolResults} />;
    }

    case "tool_result":
      return (
        <div className="bg-muted/50 border rounded-lg p-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Tool Result {block.is_error && "❌ Error"}
          </div>
          <CodeBlock
            code={
              typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content, null, 2)
            }
            language="text"
          />
        </div>
      );

    case "slash-command":
      return (
        <SlashCommandBlock
          commandName={block.commandName}
          commandMessage={block.commandMessage}
          commandArgs={block.commandArgs}
        />
      );

    case "bash-block":
      return (
        <BashBlock
          input={block.input}
          stdout={block.stdout}
          stderr={block.stderr}
        />
      );

    default:
      return null;
  }
}
