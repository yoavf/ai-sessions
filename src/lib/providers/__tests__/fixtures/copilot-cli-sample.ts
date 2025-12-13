/**
 * Simplified Copilot CLI session for testing
 * Based on real Copilot CLI JSONL format from ~/.copilot/session-state/
 */

const events = [
  {
    type: "session.start",
    data: {
      sessionId: "test-session-abc123",
      version: 1,
      producer: "copilot-agent",
      copilotVersion: "0.0.369",
      startTime: "2025-12-13T16:26:51.136Z",
    },
    id: "event-1",
    timestamp: "2025-12-13T16:26:51.136Z",
    parentId: null,
  },
  {
    type: "session.info",
    data: {
      infoType: "folder_trust",
      message:
        "Folder /Users/test/dev/project has been added to trusted folders.",
    },
    id: "event-2",
    timestamp: "2025-12-13T16:26:52.000Z",
    parentId: "event-1",
  },
  {
    type: "user.message",
    data: {
      content: "Help me improve this code",
      attachments: [],
    },
    id: "event-3",
    timestamp: "2025-12-13T16:27:00.000Z",
    parentId: "event-2",
  },
  {
    type: "assistant.message",
    data: {
      messageId: "msg-1",
      content: "I'll help you improve the code. Let me take a look.",
      toolRequests: [],
    },
    id: "event-4",
    timestamp: "2025-12-13T16:27:05.000Z",
    parentId: "event-3",
  },
  {
    type: "assistant.message",
    data: {
      messageId: "msg-2",
      content: "",
      toolRequests: [
        {
          toolCallId: "call-1",
          name: "view",
          arguments: { path: "/Users/test/dev/project/main.js" },
        },
      ],
    },
    id: "event-5",
    timestamp: "2025-12-13T16:27:06.000Z",
    parentId: "event-4",
  },
  {
    type: "assistant.message",
    data: {
      messageId: "msg-3",
      content: "I found some improvements we can make.",
      toolRequests: [
        {
          toolCallId: "call-2",
          name: "edit",
          arguments: {
            path: "/Users/test/dev/project/main.js",
            old_str: "const x = 1",
            new_str: "const count = 1",
          },
        },
      ],
    },
    id: "event-6",
    timestamp: "2025-12-13T16:27:10.000Z",
    parentId: "event-5",
  },
];

export const COPILOT_CLI_SAMPLE = events
  .map((event) => JSON.stringify(event))
  .join("\n");

// Sample with model change
const eventsWithModelChange = [
  {
    type: "session.start",
    data: {
      sessionId: "test-session-model-change",
      version: 1,
      producer: "copilot-agent",
      copilotVersion: "0.0.369",
      startTime: "2025-12-13T16:00:00.000Z",
    },
    id: "event-1",
    timestamp: "2025-12-13T16:00:00.000Z",
    parentId: null,
  },
  {
    type: "user.message",
    data: {
      content: "Hello",
      attachments: [],
    },
    id: "event-2",
    timestamp: "2025-12-13T16:00:05.000Z",
    parentId: "event-1",
  },
  {
    type: "assistant.message",
    data: {
      messageId: "msg-1",
      content: "Hi there!",
      toolRequests: [],
    },
    id: "event-3",
    timestamp: "2025-12-13T16:00:10.000Z",
    parentId: "event-2",
  },
  {
    type: "session.model_change",
    data: {
      previousModel: "claude-sonnet-4.5",
      newModel: "gpt-5.2",
    },
    id: "event-4",
    timestamp: "2025-12-13T16:01:00.000Z",
    parentId: "event-3",
  },
  {
    type: "user.message",
    data: {
      content: "Now using a different model",
      attachments: [],
    },
    id: "event-5",
    timestamp: "2025-12-13T16:01:05.000Z",
    parentId: "event-4",
  },
  {
    type: "assistant.message",
    data: {
      messageId: "msg-2",
      content: "Yes, I'm GPT now!",
      toolRequests: [],
    },
    id: "event-6",
    timestamp: "2025-12-13T16:01:10.000Z",
    parentId: "event-5",
  },
];

export const COPILOT_CLI_MODEL_CHANGE_SAMPLE = eventsWithModelChange
  .map((event) => JSON.stringify(event))
  .join("\n");

// Sample with report_intent (should be filtered out)
const eventsWithReportIntent = [
  {
    type: "session.start",
    data: {
      sessionId: "test-session-report-intent",
      version: 1,
      producer: "copilot-agent",
      copilotVersion: "0.0.369",
      startTime: "2025-12-13T16:00:00.000Z",
    },
    id: "event-1",
    timestamp: "2025-12-13T16:00:00.000Z",
    parentId: null,
  },
  {
    type: "user.message",
    data: {
      content: "Fix the bug",
      attachments: [],
    },
    id: "event-2",
    timestamp: "2025-12-13T16:00:05.000Z",
    parentId: "event-1",
  },
  {
    type: "assistant.message",
    data: {
      messageId: "msg-1",
      content: "",
      toolRequests: [
        {
          toolCallId: "call-1",
          name: "report_intent",
          arguments: { intent: "Fixing the bug" },
        },
      ],
    },
    id: "event-3",
    timestamp: "2025-12-13T16:00:06.000Z",
    parentId: "event-2",
  },
  {
    type: "assistant.message",
    data: {
      messageId: "msg-2",
      content: "I'll fix that bug for you.",
      toolRequests: [],
    },
    id: "event-4",
    timestamp: "2025-12-13T16:00:10.000Z",
    parentId: "event-3",
  },
];

export const COPILOT_CLI_REPORT_INTENT_SAMPLE = eventsWithReportIntent
  .map((event) => JSON.stringify(event))
  .join("\n");
