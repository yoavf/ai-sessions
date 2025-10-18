# Gemini CLI Support Implementation Plan

## Overview

This document outlines the detailed implementation plan for adding Gemini CLI support to AI Sessions, following the established provider pattern used for Claude Code and Codex.

## Key Format Differences

**Gemini CLI Format:**
- **Single JSON object** (NOT JSONL like Claude Code and Codex)
- Session metadata at top level: `sessionId`, `projectHash`, `startTime`, `lastUpdated`
- Messages in a `messages` array
- Message types: `"user"` or `"gemini"` (not "assistant")
- Thoughts instead of thinking blocks (with `subject` and `description`)
- Different tool call structure (nested in `toolCalls` array with `functionResponse` results)
- Token usage tracked per message
- Model info: e.g., `"gemini-2.5-pro"`

## Metadata Mapping

| Metadata Field | Gemini Source | Notes |
|----------------|---------------|-------|
| `sessionId` | Top-level `sessionId` | UUID format |
| `firstTimestamp` | Top-level `startTime` or first message `timestamp` | ISO format |
| `lastTimestamp` | Top-level `lastUpdated` or last message `timestamp` | ISO format |
| `messageCount` | Length of `messages` array | After filtering |
| `cwd` | Not available in file | May need to infer from `projectHash` or omit |
| `gitBranch` | Not available in file | Omit |

## Implementation Steps

### 1. Create Gemini Provider (`src/lib/providers/gemini.ts`)

**Key Components:**

#### Type Definitions

```typescript
interface GeminiSession {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: GeminiMessage[];
}

interface GeminiMessage {
  id: string;
  timestamp: string;
  type: "user" | "gemini";
  content: string;
  toolCalls?: GeminiToolCall[];
  thoughts?: GeminiThought[];
  model?: string;
  tokens?: {
    input: number;
    output: number;
    cached: number;
    thoughts: number;
    tool: number;
    total: number;
  };
}

interface GeminiToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  result: Array<{ functionResponse: { ... } }>;
  status: string;
  timestamp: string;
  displayName?: string;
  description?: string;
}

interface GeminiThought {
  subject: string;
  description: string;
  timestamp: string;
}
```

#### Detection Logic

- Check if content is valid JSON (not JSONL)
- Look for top-level `sessionId`, `projectHash`, `messages` fields
- Check for `type: "gemini"` in messages array
- Check for `thoughts` array structure

#### Parsing Logic

- Parse entire JSON (unlike line-by-line for JSONL formats)
- Extract session metadata from top level
- Transform messages:
  - Convert `type: "gemini"` → `role: "assistant"`
  - Convert `type: "user"` → `role: "user"`
  - Parse `thoughts` into `thinking` content blocks
  - Parse `toolCalls` into `tool_use` and `tool_result` content blocks
  - Handle text content
- Generate UUIDs for TranscriptLine entries
- Set `parentUuid` to null (Gemini doesn't track message relationships)

#### Model Formatting

```typescript
function formatGeminiModelName(modelId: string): string | null {
  // gemini-2.5-pro → Gemini 2.5 Pro
  // gemini-2.0-flash → Gemini 2.0 Flash
  const match = modelId.match(/^gemini-(.+)$/);
  if (match) {
    const parts = match[1].split("-");
    return `Gemini ${parts.map(p =>
      p.charAt(0).toUpperCase() + p.slice(1)
    ).join(" ")}`;
  }
  return modelId;
}
```

### 2. Update Provider Registry (`src/lib/providers/index.ts`)

- Import `GeminiProvider`
- Add to providers array: `new GeminiProvider()`
- Export `GeminiProvider` class

### 3. Update Parser (`src/lib/parser.ts`)

- Already has `"gemini-cli": "Gemini CLI"` in display names ✅
- No changes needed (uses provider system)

### 4. Create Test Fixtures (`src/lib/providers/__tests__/fixtures/gemini-sample.ts`)

Create a minimal valid Gemini session for testing:
- Include user message
- Include Gemini message with thoughts
- Include tool call with result
- Include multiple messages to test sequencing

### 5. Create Tests (`src/lib/providers/__tests__/gemini.test.ts`)

Test cases:
- **Detection:** Correctly identifies Gemini format vs Claude Code/Codex
- **Parsing:** Extracts all metadata correctly
- **Message transformation:** User/Gemini roles mapped properly
- **Thoughts parsing:** Thoughts array converted to thinking blocks
- **Tool calls:** Tool calls and results properly structured
- **Model formatting:** Model names formatted correctly
- **Edge cases:** Empty messages, missing fields, invalid JSON

### 6. Verify Integration

- Test upload flow with real Gemini file
- Verify transcript viewer renders Gemini sessions correctly
- Test model stats calculation
- Verify OpenGraph metadata generation

## Challenges & Considerations

### 1. No CWD/Git Info
Gemini files don't include `cwd` or git branch.

**Solution:** Leave these fields empty/undefined. Consider inferring project path from `projectHash` if needed later.

### 2. JSON vs JSONL
Different parsing approach needed.

**Solution:**
- Detection: First check if content is valid JSON object (not JSONL)
- Parsing: Use `JSON.parse()` once instead of line-by-line

### 3. Thoughts Structure
Different from Claude's thinking blocks.

**Solution:** Combine `subject` + `description` into thinking content. Format: `"${subject}\n\n${description}"` or just use description.

### 4. Tool Call Nesting
Results nested in `functionResponse` wrapper.

**Solution:**
- Extract `response.output` from nested structure
- Handle array of results (may have multiple responses)

### 5. Message Ordering
All messages in single array.

**Solution:**
- Process sequentially, use message `timestamp` for ordering
- May need to group tool calls/results with their assistant message

## Files to Create/Modify

### Create
- `src/lib/providers/gemini.ts` (~300-400 lines, similar to codex.ts)
- `src/lib/providers/__tests__/gemini.test.ts` (~200 lines)
- `src/lib/providers/__tests__/fixtures/gemini-sample.ts` (~100 lines)

### Modify
- `src/lib/providers/index.ts` (add import and registration)

### No Changes Needed
- `src/lib/parser.ts` (already has gemini-cli display name)
- `src/types/transcript.ts` (existing types work)
- UI components (already handle all content block types)

## Testing Strategy

1. **Unit tests:** Use minimal fixtures to test each component
2. **Integration test:** Upload actual Gemini file from `~/.gemini/`
3. **Visual test:** Verify rendering in browser
4. **Model stats:** Ensure Gemini model appears correctly

## Example Session Structure

```json
{
  "sessionId": "f86f5318-f47b-4433-85f8-ec9d9a417f8e",
  "projectHash": "79b6fa86e3c0d31765c7e3c6de511a7b96342a2e947135d5db396e49e27020cd",
  "startTime": "2025-10-18T14:57:28.974Z",
  "lastUpdated": "2025-10-18T14:58:07.161Z",
  "messages": [
    {
      "id": "91ff4a35-0f7b-492d-8a04-ee206be11ec6",
      "timestamp": "2025-10-18T14:57:28.974Z",
      "type": "user",
      "content": "User message text here"
    },
    {
      "id": "9cea53d4-c143-4bd1-bde2-7294e27deb9d",
      "timestamp": "2025-10-18T14:57:31.684Z",
      "type": "gemini",
      "content": "",
      "toolCalls": [
        {
          "id": "list_directory-1760799451650-5979488a89c64",
          "name": "list_directory",
          "args": { "path": "/Users/yoavfarhi/dev/ai-sessions-mcp" },
          "result": [
            {
              "functionResponse": {
                "id": "list_directory-1760799451650-5979488a89c64",
                "name": "list_directory",
                "response": {
                  "output": "Directory listing output..."
                }
              }
            }
          ],
          "status": "success",
          "timestamp": "2025-10-18T14:57:31.684Z"
        }
      ],
      "thoughts": [
        {
          "subject": "Mapping the Landscape",
          "description": "I've begun by cataloging the files...",
          "timestamp": "2025-10-18T14:57:31.634Z"
        }
      ],
      "model": "gemini-2.5-pro",
      "tokens": {
        "input": 8396,
        "output": 20,
        "cached": 0,
        "thoughts": 24,
        "tool": 0,
        "total": 8440
      }
    }
  ]
}
```

## Implementation Notes

- This implementation follows the established patterns from Claude Code and Codex providers
- Ensures consistency and maintainability
- Reuses existing type definitions and UI components
- Minimal changes to existing codebase
