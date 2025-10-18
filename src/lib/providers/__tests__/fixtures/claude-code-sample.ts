/**
 * Sample Claude Code transcript for testing
 */
export const claudeCodeSample = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello, can you help me?"}]},"uuid":"123e4567-e89b-12d3-a456-426614174000","timestamp":"2024-01-01T10:00:00.000Z","parentUuid":null,"sessionId":"test-session-123","cwd":"/test/path"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Of course! I'd be happy to help."}],"model":"claude-sonnet-4-5-20250929"},"uuid":"123e4567-e89b-12d3-a456-426614174001","timestamp":"2024-01-01T10:00:01.000Z","parentUuid":"123e4567-e89b-12d3-a456-426614174000","sessionId":"test-session-123"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_123","content":"File created successfully"}]},"uuid":"123e4567-e89b-12d3-a456-426614174002","timestamp":"2024-01-01T10:00:02.000Z","parentUuid":"123e4567-e89b-12d3-a456-426614174001","sessionId":"test-session-123"}
{"type":"file-history-snapshot","sessionId":"test-session-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"thinking","thinking":"I should check the file system"},{"type":"tool_use","id":"toolu_456","name":"Read","input":{"file_path":"/test/file.txt"}}],"model":"claude-sonnet-4-5-20250929"},"uuid":"123e4567-e89b-12d3-a456-426614174003","timestamp":"2024-01-01T10:00:03.000Z","parentUuid":"123e4567-e89b-12d3-a456-426614174002","sessionId":"test-session-123"}`;

export const claudeCodeWithCommands = `{"type":"user","message":{"role":"user","content":"<command-name>/commit</command-name><command-message>Committing changes</command-message><command-args></command-args>"},"uuid":"cmd-001","timestamp":"2024-01-01T10:00:00.000Z","sessionId":"test-session-456"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"<bash-input>ls -la</bash-input><bash-stdout>total 0</bash-stdout>"}]},"uuid":"cmd-002","timestamp":"2024-01-01T10:00:01.000Z","sessionId":"test-session-456"}`;
