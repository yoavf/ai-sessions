/**
 * GitHub Copilot CLI transcript provider
 * Parses JSONL files from GitHub Copilot CLI sessions
 */

import type {
  ContentBlock,
  ParsedTranscript,
  TranscriptLine,
} from "@/types/transcript";
import type { TranscriptProvider } from "./types";

// Event type constants
const EVENT_SESSION_START = "session.start";
const EVENT_SESSION_INFO = "session.info";
const EVENT_MODEL_CHANGE = "session.model_change";
const EVENT_USER_MESSAGE = "user.message";
const EVENT_ASSISTANT_MESSAGE = "assistant.message";

interface CopilotEvent {
  type: string;
  data: Record<string, unknown>;
  id: string;
  timestamp: string;
  parentId: string | null;
}

interface CopilotSessionStart {
  sessionId: string;
  version: number;
  producer: string;
  copilotVersion: string;
  startTime: string;
}

interface CopilotSessionInfo {
  infoType: string;
  message: string;
}

interface CopilotModelChange {
  previousModel?: string;
  newModel: string;
}

interface CopilotUserMessage {
  content: string;
  attachments?: unknown[];
}

interface CopilotAssistantMessage {
  messageId: string;
  content: string;
  toolRequests?: CopilotToolRequest[];
}

interface CopilotToolRequest {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown> | string;
}

export class CopilotCliProvider implements TranscriptProvider {
  readonly name = "copilot-cli";
  readonly displayName = "Copilot CLI";

  detect(content: string): boolean {
    const lines = content.trim().split("\n").slice(0, 10);

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as Partial<CopilotEvent>;

        if (event.type === EVENT_SESSION_START && event.data) {
          const data = event.data as Partial<CopilotSessionStart>;
          if (
            data.producer === "copilot-agent" ||
            data.copilotVersion !== undefined
          ) {
            return true;
          }
        }

        if (
          event.type &&
          (event.type === EVENT_MODEL_CHANGE ||
            event.type === "session.truncation" ||
            (event.type === EVENT_SESSION_INFO &&
              (event.data as unknown as CopilotSessionInfo)?.infoType ===
                "mcp"))
        ) {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  parse(content: string): ParsedTranscript {
    const lines = content.trim().split("\n");
    const messages: TranscriptLine[] = [];

    let sessionId = "";
    let cwd: string | undefined;
    let firstTimestamp = "";
    let lastTimestamp = "";

    const folderTrustRegex = /Folder (.+) has been added to trusted folders/;

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as CopilotEvent;

        if (event.timestamp) {
          if (!firstTimestamp || event.timestamp < firstTimestamp) {
            firstTimestamp = event.timestamp;
          }
          if (!lastTimestamp || event.timestamp > lastTimestamp) {
            lastTimestamp = event.timestamp;
          }
        }

        switch (event.type) {
          case EVENT_SESSION_START: {
            const data = event.data as unknown as CopilotSessionStart;
            sessionId = data.sessionId || event.id;
            break;
          }

          case EVENT_SESSION_INFO: {
            const data = event.data as unknown as CopilotSessionInfo;
            if (data.infoType === "folder_trust") {
              const match = folderTrustRegex.exec(data.message);
              if (match?.[1]) {
                cwd = match[1];
              }
            }
            // Skip session.info model messages - we handle model changes via EVENT_MODEL_CHANGE
            break;
          }

          case EVENT_MODEL_CHANGE: {
            // Create a visual divider for model changes
            const data = event.data as unknown as CopilotModelChange;
            messages.push({
              type: "assistant",
              message: {
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: `__MODEL_CHANGE__${data.newModel}`,
                  },
                ],
              },
              uuid: event.id,
              timestamp: event.timestamp,
              parentUuid: event.parentId,
              sessionId,
              cwd,
            });
            break;
          }

          case EVENT_USER_MESSAGE: {
            const data = event.data as unknown as CopilotUserMessage;
            const transcriptLine: TranscriptLine = {
              type: "user",
              message: {
                role: "user",
                content: data.content,
              },
              uuid: event.id,
              timestamp: event.timestamp,
              parentUuid: event.parentId,
              sessionId,
              cwd,
            };
            messages.push(transcriptLine);
            break;
          }

          case EVENT_ASSISTANT_MESSAGE: {
            const data = event.data as unknown as CopilotAssistantMessage;
            const contentBlocks: ContentBlock[] = [];

            if (data.content && data.content.trim()) {
              contentBlocks.push({
                type: "text",
                text: data.content,
              });
            }

            if (data.toolRequests && data.toolRequests.length > 0) {
              for (const toolReq of data.toolRequests) {
                // Skip report_intent - it's internal logging, not meaningful to display
                if (toolReq.name === "report_intent") {
                  continue;
                }

                let args;
                if (typeof toolReq.arguments === "string") {
                  try {
                    args = JSON.parse(toolReq.arguments);
                  } catch {
                    // Malformed JSON, skip this tool request
                    continue;
                  }
                } else {
                  args = toolReq.arguments;
                }

                contentBlocks.push({
                  type: "tool_use",
                  id: toolReq.toolCallId,
                  name: toolReq.name,
                  input: args || {},
                });
              }
            }

            // Only create message if there's actual content to show
            if (contentBlocks.length > 0) {
              const transcriptLine: TranscriptLine = {
                type: "assistant",
                message: {
                  role: "assistant",
                  content: contentBlocks,
                },
                uuid: event.id,
                timestamp: event.timestamp,
                parentUuid: event.parentId,
                sessionId,
                cwd,
              };
              messages.push(transcriptLine);
            }
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!sessionId && messages.length > 0) {
      sessionId = messages[0].uuid || "unknown";
    }

    return {
      messages,
      sessionId,
      cwd,
      metadata: {
        firstTimestamp: firstTimestamp || new Date().toISOString(),
        lastTimestamp: lastTimestamp || new Date().toISOString(),
        messageCount: messages.length,
      },
    };
  }
}
