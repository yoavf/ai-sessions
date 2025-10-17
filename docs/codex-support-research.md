# Research: Supporting Codex Files in AI Sessions

## Executive Summary

This document provides a comprehensive analysis and implementation plan for adding OpenAI Codex JSONL file support to AI Sessions. The codebase already has partial infrastructure for multi-provider support (database schema includes `source` field, display names are mapped), but the parser and frontend components are currently Claude Code-specific.

## Current State Analysis

### Existing Multi-Provider Infrastructure

The codebase already includes some foundation for supporting multiple AI providers:

1. **Database Schema** (`prisma/schema.prisma:73`)
   - `source` field with default "claude-code"
   - Comments indicate support for: "claude-code", "codex", "gemini-cli"
   - Field is stored but not yet actively used for parsing logic

2. **Display Name Mapping** (multiple locations)
   - `src/lib/parser.ts:81-85`: `sourceDisplayNames` mapping
   - `src/app/t/[token]/opengraph-image.tsx:21-25`: `SOURCE_DISPLAY_NAMES` mapping
   - Both already include "codex" → "Codex" mapping

3. **Source Assignment** (upload endpoints)
   - Web uploads: Hard-coded to "claude-code" (`src/app/api/transcripts/route.ts:166`)
   - CLI uploads: Hard-coded to "cli" (`src/app/api/cli/upload/route.ts:179`)
   - No detection logic exists yet

### Current Claude Code-Specific Implementation

The parser (`src/lib/parser.ts`) is tightly coupled to Claude Code's format:

1. **Expected Structure** (`TranscriptLine` interface in `src/types/transcript.ts:50-61`)
   ```typescript
   {
     type: "user" | "assistant" | "file-history-snapshot",
     message?: {
       role: "user" | "assistant",
       content: string | ContentBlock[],
       model?: string
     },
     uuid: string,
     timestamp: string,
     parentUuid: string | null,
     cwd?: string,
     gitBranch?: string,
     sessionId?: string,
     toolUseResult?: string | Record<string, any>
   }
   ```

2. **Special Parsing Logic**
   - Skips "file-history-snapshot" entries (`parser.ts:207`)
   - Parses slash command XML tags (`<command-name>`, `<command-message>`, `<command-args>`)
   - Parses bash block XML tags (`<bash-input>`, `<bash-stdout>`, `<bash-stderr>`)
   - Extracts: sessionId, timestamps, cwd, gitBranch

3. **Content Block Types** (`src/types/transcript.ts:36-42`)
   - `ToolUse`, `ToolResult`, `TextContent`, `ThinkingContent`
   - `CommandContent` (slash commands)
   - `BashContent` (bash input/output)

4. **Metadata Extraction** (`parser.ts:244-270`)
   - sessionId (first occurrence)
   - firstTimestamp, lastTimestamp (from timestamp fields)
   - messageCount (array length)
   - cwd (first occurrence)

5. **Model Stats Calculation** (`parser.ts:162-192`)
   - Extracts model names from assistant messages
   - Formats model IDs to friendly names (e.g., "claude-opus-4-20250514" → "Claude Opus 4")
   - Calculates usage percentages

### Frontend Rendering

The transcript viewer is provider-agnostic at the rendering level but depends on the parsed structure:

- `TranscriptViewer.tsx`: Layout, header, metadata display
- `MessageRenderer.tsx`: Renders different content block types
- `ToolCallBlock.tsx`: Collapsible tool calls
- `CodeBlock.tsx`: Syntax-highlighted code
- System message filtering (hides IDE notifications, hooks, etc.)

## Codex Format Analysis

### What We Need to Discover

To create a Codex provider, we need to understand:

1. **File Structure**
   - Line-by-line format (similar to Claude Code?)
   - Message structure (role, content, timestamp)
   - Metadata fields (session ID, model info, etc.)

2. **Content Format**
   - How are tool calls represented?
   - How are tool results structured?
   - Are there "thinking" blocks or similar?
   - How is code/output represented?

3. **Available Metadata**
   - Session/conversation ID
   - Timestamps
   - Model information
   - Working directory or context
   - Any Codex-specific fields (repo info, branch, etc.)

4. **Codex-Specific Features**
   - What unique information does Codex provide that Claude Code doesn't?
   - Examples: Commit IDs, PR numbers, code review info, CI/CD status, etc.

### Expected Differences from Claude Code

Based on typical OpenAI API formats, we can anticipate:

1. **Message Structure**
   - May use OpenAI's standard message format
   - Tool calls might use `function_call` or `tool_calls` format
   - No "thinking" blocks (not part of OpenAI API)

2. **Metadata**
   - May not have `parentUuid` relationship tracking
   - Timestamps might be in different format (Unix vs ISO)
   - May not have `cwd` or `gitBranch` fields

3. **Special Features**
   - May include Codex-specific fields like:
     - Repository information
     - File paths being edited
     - Code review context
     - Completion quality metrics

### Research Needed with Actual File

**ACTION REQUIRED**: Once the sample Codex file is accessible, analyze:

1. Parse first 10-20 lines to understand structure
2. Identify all unique fields present in Codex but not Claude Code
3. Identify fields present in Claude Code but missing in Codex
4. Document how tool calls/results are represented
5. Check for any proprietary Codex features worth displaying
6. Verify timestamp formats and session ID structures

## Requirements Analysis

### Requirement 1: Extract Claude Code Code into Provider

**Goal**: Refactor monolithic parser into provider-based architecture

**Current Issues**:
- Parser is Claude Code-specific
- No abstraction for provider-specific logic
- Hard-coded assumptions about format

**Recommended Approach**:

Create a provider interface and separate implementations:

```typescript
// src/lib/providers/types.ts
interface TranscriptProvider {
  name: string;
  detect(content: string): boolean;
  parse(content: string): ParsedTranscript;
  formatModelName?(modelId: string): string | null;
  getDefaultTitle?(metadata: any): string;
}

// src/lib/providers/index.ts
export function detectProvider(content: string): TranscriptProvider {
  // Try each provider's detect() method
  // Return first match or default to claude-code
}

export function parseTranscript(content: string, providerHint?: string): ParsedTranscript {
  const provider = providerHint
    ? getProviderByName(providerHint)
    : detectProvider(content);
  return provider.parse(content);
}
```

**Benefits**:
- Clean separation of concerns
- Easy to add new providers (Gemini CLI, etc.)
- Each provider can have custom logic
- Detection can be automatic or explicit

### Requirement 2: Create Codex Provider

**Goal**: Implement `CodexProvider` class

**Implementation Structure**:

```typescript
// src/lib/providers/codex.ts
export class CodexProvider implements TranscriptProvider {
  name = "codex";

  detect(content: string): boolean {
    // Parse first few lines and check for Codex-specific fields
    // e.g., specific message structure, metadata fields
  }

  parse(content: string): ParsedTranscript {
    // Parse Codex JSONL format
    // Extract Codex-specific metadata
    // Convert to unified ParsedTranscript structure
  }

  formatModelName(modelId: string): string | null {
    // Format OpenAI model names (gpt-4, gpt-3.5-turbo, etc.)
  }
}
```

**Key Challenges**:
1. **Detection Logic**: How to reliably distinguish Codex from Claude Code?
   - Check for OpenAI-specific fields (`function_call`, `tool_calls` structure)
   - Check for absence of Claude-specific fields (`thinking`, `type: "file-history-snapshot"`)
   - Validate first few lines for structural differences

2. **Format Conversion**: Map Codex format to unified `ParsedTranscript`
   - Tool calls: OpenAI `tool_calls` → `ToolUse` ContentBlock
   - Tool results: OpenAI response → `ToolResult` ContentBlock
   - Messages: Preserve role, convert content structure

3. **Metadata Extraction**: What's available?
   - Need actual file to determine available metadata
   - May need to infer sessionId if not present
   - Timestamps may require format conversion

4. **Model Name Formatting**:
   ```typescript
   // Examples:
   "gpt-4-turbo-2024-04-09" → "GPT-4 Turbo"
   "gpt-3.5-turbo" → "GPT-3.5 Turbo"
   "code-davinci-002" → "Codex (Davinci)"
   ```

**Information Needed from Sample File**:
- Complete message structure
- Tool call/result format
- Metadata fields
- Timestamp format
- Session ID location (if any)
- Model ID format

### Requirement 3: Add Detection Logic

**Goal**: Automatically detect file format on upload

**Recommended Approach**:

```typescript
// src/lib/providers/detector.ts
export function detectFileFormat(content: string): {
  provider: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const lines = content.trim().split('\n').slice(0, 10); // Check first 10 lines

  // Try parsing as JSON
  const samples = lines.map(line => {
    try { return JSON.parse(line); }
    catch { return null; }
  }).filter(Boolean);

  if (samples.length === 0) {
    throw new Error('Invalid JSONL format');
  }

  // Check for Claude Code indicators
  const hasClaudeFields = samples.some(s =>
    s.type === 'file-history-snapshot' ||
    s.message?.content?.some((b: any) => b.type === 'thinking')
  );

  if (hasClaudeFields) {
    return { provider: 'claude-code', confidence: 'high' };
  }

  // Check for Codex indicators (TBD based on actual format)
  const hasCodexFields = samples.some(s =>
    // Add Codex-specific field checks here
    s.function_call || s.tool_calls || /* other indicators */
  );

  if (hasCodexFields) {
    return { provider: 'codex', confidence: 'high' };
  }

  // Default to claude-code with low confidence
  return { provider: 'claude-code', confidence: 'low' };
}
```

**Integration Points**:
1. **Web Upload** (`src/app/api/transcripts/route.ts:166`)
   - Replace hard-coded `source: "claude-code"`
   - Call `detectFileFormat(originalFileData)`
   - Store detected provider in `source` field

2. **CLI Upload** (`src/app/api/cli/upload/route.ts:179`)
   - Same detection logic
   - Or accept optional `source` parameter in request body

3. **Parser** (`src/lib/parser.ts`)
   - Update `parseJSONL()` to accept provider parameter
   - Route to appropriate provider implementation

**Edge Cases to Handle**:
- Ambiguous format (matches multiple providers)
- Invalid JSONL (not parseable)
- Empty or truncated files
- Malformed JSON lines
- Provider-specific version differences

### Requirement 4: Update Site Messaging

**Goal**: Update UI/UX to reflect multi-provider support

**Changes Required**:

1. **Homepage** (`src/app/page.tsx`)
   - Update dropzone text from "Upload Claude Code session" to "Upload AI session transcript"
   - Add supported formats list: "Supports Claude Code, OpenAI Codex, and more"
   - Update file type hint from `.jsonl` to `.jsonl` (remains same but update description)

2. **Upload Component** (if exists)
   - Update placeholder text
   - Add format detection feedback ("Detected: Claude Code" after upload)

3. **Transcript Viewer** (`src/components/TranscriptViewer.tsx`)
   - Display source badge or indicator
   - Consider showing provider logo/icon
   - Metadata section should show source (already shows via model stats)

4. **OpenGraph Images** (`src/app/t/[token]/opengraph-image.tsx`)
   - Already has `SOURCE_DISPLAY_NAMES` mapping
   - Consider showing source badge more prominently
   - Ensure all providers have good visual representation

5. **Documentation** (README, help text, etc.)
   - Update any references to "Claude Code only"
   - Add section on supported formats
   - Document detection logic for users
   - Explain provider-specific features

6. **Error Messages**
   - "Unsupported file format" instead of "Invalid Claude Code transcript"
   - Provide hints about expected format
   - Suggest which provider the file might belong to

7. **Metadata Display**
   - Show source provider clearly
   - Adapt metadata display based on what's available (some fields may be Codex-specific)

**Copy Changes** (specific examples):

| Location | Current | Proposed |
|----------|---------|----------|
| Homepage Hero | "Share Claude Code Sessions" | "Share AI Coding Sessions" |
| Dropzone | "Drop Claude Code transcript here" | "Drop transcript here (.jsonl)" |
| File Picker | "Select Claude Code .jsonl file" | "Select .jsonl transcript file" |
| Upload Success | "Claude Code session uploaded" | "Session uploaded successfully" |
| Error Message | "Invalid Claude Code format" | "Unrecognized transcript format. Supports Claude Code, Codex, and more." |

## Implementation Plan

### Phase 1: Provider Infrastructure (No Codex File Needed)

**Goal**: Set up provider architecture without requiring Codex file

**Tasks**:
1. Create provider interface and types
   - `src/lib/providers/types.ts` - Core interfaces
   - `src/lib/providers/index.ts` - Provider registry and factory

2. Extract Claude Code provider
   - `src/lib/providers/claude-code.ts` - Move parsing logic from `parser.ts`
   - Preserve all existing behavior
   - Add detection logic (check for Claude-specific fields)

3. Update parser to use providers
   - Modify `src/lib/parser.ts` to route through provider system
   - Keep backward compatibility
   - Add provider detection

4. Add unit tests for provider system
   - Test provider detection
   - Test Claude Code provider (use existing expectations)
   - Test fallback behavior

**Deliverables**:
- Provider architecture implemented
- Claude Code provider extracted
- All existing tests pass
- No functional changes to end users

**Estimated Effort**: 4-6 hours

### Phase 2: Codex Provider (Requires Sample File)

**Goal**: Implement Codex-specific provider

**Prerequisites**:
- Access to sample Codex JSONL file
- Analysis of Codex format completed

**Tasks**:
1. Analyze Codex format
   - Parse sample file
   - Document structure differences
   - Identify unique fields
   - Map to unified format

2. Implement CodexProvider
   - `src/lib/providers/codex.ts`
   - Detection logic
   - Parsing logic
   - Metadata extraction
   - Model name formatting

3. Update content block types (if needed)
   - Add Codex-specific block types to `src/types/transcript.ts`
   - Or map Codex format to existing blocks

4. Test with sample file
   - Verify detection works
   - Verify parsing produces correct output
   - Check metadata extraction
   - Test rendering in UI

**Deliverables**:
- Codex provider implementation
- Sample file parses correctly
- Renders properly in UI

**Estimated Effort**: 4-8 hours (depends on format complexity)

### Phase 3: Detection & Integration

**Goal**: Auto-detect format and integrate across all endpoints

**Tasks**:
1. Implement robust detection logic
   - `src/lib/providers/detector.ts`
   - Test with both Claude Code and Codex files
   - Handle edge cases

2. Update upload endpoints
   - Web upload: Auto-detect and store source
   - CLI upload: Auto-detect or accept parameter
   - Add detection feedback to responses

3. Update parser calls
   - Pass source hint when available
   - Fall back to detection
   - Handle unknown formats gracefully

4. Test upload flows
   - Upload Claude Code file → detects correctly
   - Upload Codex file → detects correctly
   - Upload invalid file → shows helpful error

**Deliverables**:
- Auto-detection working
- Both file types upload successfully
- Correct source stored in database

**Estimated Effort**: 3-4 hours

### Phase 4: UI/UX Updates

**Goal**: Update all user-facing text and components

**Tasks**:
1. Update homepage and marketing copy
   - Remove Claude Code-specific language
   - Add multi-provider messaging
   - Update examples and screenshots

2. Update components
   - Dropzone text and hints
   - Error messages
   - Success messages
   - Loading states

3. Enhance transcript viewer
   - Show provider badge/icon
   - Adapt metadata display
   - Handle provider-specific features

4. Update documentation
   - README
   - Help/FAQ section
   - API documentation (if exists)

**Deliverables**:
- All UI text updated
- Provider indicators visible
- Documentation complete

**Estimated Effort**: 2-3 hours

### Phase 5: Testing & Polish

**Goal**: Comprehensive testing and refinement

**Tasks**:
1. End-to-end testing
   - Upload Claude Code files
   - Upload Codex files
   - Test all features (view, share, delete, edit title)
   - Test OpenGraph generation

2. Edge case testing
   - Malformed files
   - Mixed format indicators
   - Very large files
   - Empty files

3. Performance testing
   - Large Codex files
   - Detection speed
   - Parsing speed

4. Visual polish
   - Provider badges/icons
   - Consistent styling
   - Responsive design

**Deliverables**:
- All tests pass
- No regressions
- Good UX for both providers

**Estimated Effort**: 2-4 hours

### Total Estimated Effort

**Minimum**: ~15 hours
**Maximum**: ~25 hours

Depends heavily on Codex format complexity and whether new UI components are needed.

## Risk Analysis

### Technical Risks

1. **Codex Format Incompatibility** (High Impact, Medium Probability)
   - Risk: Codex format is significantly different from Claude Code
   - Mitigation: Provider abstraction allows custom parsing logic
   - Mitigation: Can map Codex concepts to similar Claude Code concepts

2. **Detection Ambiguity** (Medium Impact, Medium Probability)
   - Risk: Cannot reliably distinguish between formats
   - Mitigation: Require manual provider selection as fallback
   - Mitigation: Use multiple heuristics for confidence scoring

3. **Missing Metadata** (Medium Impact, High Probability)
   - Risk: Codex files lack sessionId, timestamps, or other expected fields
   - Mitigation: Make all metadata fields optional
   - Mitigation: Generate synthetic values where needed
   - Mitigation: Gracefully degrade UI when data unavailable

4. **Tool Call Format Differences** (Medium Impact, High Probability)
   - Risk: OpenAI tool calling format differs from Claude
   - Mitigation: Map OpenAI `tool_calls` to `ToolUse` blocks
   - Mitigation: Extract relevant information even if structure differs

5. **Performance Degradation** (Low Impact, Low Probability)
   - Risk: Multiple providers slow down parsing
   - Mitigation: Detection only parses first few lines
   - Mitigation: Cache provider hint in database
   - Mitigation: Optimize hot paths

### Product Risks

1. **User Confusion** (Medium Impact, Low Probability)
   - Risk: Users don't understand multi-provider support
   - Mitigation: Clear messaging and examples
   - Mitigation: Auto-detection means users don't need to think about it
   - Mitigation: Show detected format in UI

2. **Feature Parity** (Low Impact, Medium Probability)
   - Risk: Some features work better for Claude Code than Codex
   - Mitigation: Document provider-specific limitations
   - Mitigation: Gracefully hide unavailable features
   - Mitigation: Ensure core functionality (view, share) works for all

3. **Backward Compatibility** (High Impact, Low Probability)
   - Risk: Break existing Claude Code uploads
   - Mitigation: Extensive testing with existing files
   - Mitigation: Provider abstraction preserves existing logic
   - Mitigation: Gradual rollout with feature flag if needed

## Success Criteria

### Functional Requirements

- [ ] Codex files upload successfully
- [ ] Codex files are automatically detected
- [ ] Codex files parse without errors
- [ ] Codex transcripts render correctly in UI
- [ ] Codex metadata displays properly
- [ ] Claude Code files continue to work (no regression)
- [ ] OpenGraph images work for both providers
- [ ] Model stats calculate correctly for both providers

### Non-Functional Requirements

- [ ] Parsing performance is acceptable (< 1s for typical files)
- [ ] Detection is reliable (> 95% accuracy)
- [ ] Error messages are clear and actionable
- [ ] UI is consistent across providers
- [ ] Code is maintainable and well-documented
- [ ] New providers can be added easily (< 4 hours)

### User Experience

- [ ] Users don't need to specify provider manually
- [ ] Upload flow is unchanged for existing users
- [ ] Provider is clearly indicated in UI
- [ ] Errors clearly explain what went wrong
- [ ] Documentation explains supported formats

## Future Considerations

### Additional Providers

The provider architecture should make it easy to add:

1. **Gemini CLI** (already planned per schema comments)
   - Similar structure to Claude Code likely
   - Google-specific model names
   - May have Google Workspace integration fields

2. **Cursor**
   - VS Code extension format
   - May include editor-specific metadata
   - Likely similar to Codex structure

3. **GitHub Copilot**
   - If they export session logs
   - Would need reverse engineering

4. **Aider**
   - Command-line tool
   - Likely custom format
   - May need special parsing

### Enhanced Features

1. **Provider-Specific Visualizations**
   - Codex: Show code diff view
   - Claude Code: Show file tree navigation
   - Gemini: Show workspace context

2. **Format Conversion**
   - Export Codex as Claude Code format
   - Cross-provider compatibility

3. **Analytics**
   - Track provider usage
   - Identify popular features per provider
   - Inform future development priorities

4. **Hybrid Sessions**
   - Support files with multiple providers in one session
   - Tag messages by provider
   - Compare responses side-by-side

## Appendix A: Code Structure

```
src/
├── lib/
│   ├── providers/
│   │   ├── types.ts           # TranscriptProvider interface
│   │   ├── index.ts           # Provider registry, factory, detection
│   │   ├── claude-code.ts     # ClaudeCodeProvider implementation
│   │   ├── codex.ts           # CodexProvider implementation
│   │   └── detector.ts        # Auto-detection logic
│   └── parser.ts              # High-level parsing functions (uses providers)
├── types/
│   └── transcript.ts          # Shared types (ParsedTranscript, ContentBlock, etc.)
└── app/
    ├── api/
    │   ├── transcripts/route.ts   # Web upload (use auto-detection)
    │   └── cli/upload/route.ts    # CLI upload (use auto-detection)
    └── t/[token]/
        └── page.tsx               # Viewer (provider-agnostic)
```

## Appendix B: Research Checklist

**Once sample Codex file is available:**

- [ ] Parse first 20 lines successfully
- [ ] Document complete message structure
- [ ] Identify all top-level fields
- [ ] Document tool call/result format
- [ ] Identify metadata fields (timestamps, session ID, etc.)
- [ ] Check for model information
- [ ] Identify Codex-specific unique fields
- [ ] List fields present in Claude Code but missing in Codex
- [ ] Verify JSON structure consistency
- [ ] Check for any authentication/sensitive data
- [ ] Determine average file size
- [ ] Test with DLP scanner (ensure no issues)
- [ ] Create unit test fixtures
- [ ] Document edge cases found

## Appendix C: Example Provider Detection Logic

```typescript
// Pseudo-code for detection algorithm

function detectProvider(content: string): string {
  const samples = getSampleLines(content, 5);

  // Check for Claude Code indicators (high confidence)
  if (samples.some(hasClaudeSpecificType)) return 'claude-code';
  if (samples.some(hasThinkingBlock)) return 'claude-code';
  if (samples.some(hasFileHistorySnapshot)) return 'claude-code';

  // Check for Codex indicators (TBD based on actual format)
  if (samples.some(hasOpenAIToolCall)) return 'codex';
  if (samples.some(hasCodexSpecificField)) return 'codex';

  // Fallback: Try to parse with each provider and see which succeeds
  for (const provider of [claudeCode, codex]) {
    if (provider.canParse(content)) return provider.name;
  }

  // Last resort: default to claude-code
  return 'claude-code';
}
```

## Conclusion

This document provides a comprehensive plan for adding Codex support to AI Sessions. The phased approach allows for incremental development, with Phase 1 (provider infrastructure) possible immediately, and Phase 2+ waiting for sample file analysis.

**Key Takeaways**:
1. Provider abstraction is the right architectural approach
2. Auto-detection is feasible with proper heuristics
3. Codex integration is achievable with moderate effort (~15-25 hours)
4. UI changes are straightforward (mostly copy updates)
5. Architecture will easily support future providers

**Next Steps**:
1. Obtain and analyze sample Codex file
2. Update this document with Codex-specific findings
3. Begin Phase 1 implementation (provider infrastructure)
4. Proceed through phases sequentially
5. Test thoroughly with both file formats

---

**Document Version**: 1.0
**Date**: October 17, 2025
**Author**: Claude (AI Assistant)
**Status**: Ready for review
