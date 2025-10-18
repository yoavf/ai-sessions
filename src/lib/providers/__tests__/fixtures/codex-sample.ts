/**
 * Sample Codex transcripts for testing (both older and newer formats)
 */

// Older/direct format (from claude-pair)
export const codexOlderFormat = `{"id":"test-session-789","timestamp":"2024-01-01T10:00:00.000Z","instructions":null,"git":{"commit_hash":"abc123","branch":"main","repository_url":"git@github.com:test/repo.git"}}
{"record_type":"state"}
{"type":"message","role":"user","content":[{"type":"input_text","text":"Create a README file"}]}
{"record_type":"state"}
{"type":"reasoning","id":"rs_001","summary":[{"type":"summary_text","text":"Planning to create README"}],"content":null,"encrypted_content":"encrypted_data_here"}
{"type":"message","role":"assistant","content":[{"type":"output_text","text":"I'll create a README file for you."}]}
{"type":"function_call","name":"Write","arguments":"{\\"file_path\\":\\"/README.md\\",\\"content\\":\\"# Project\\"}","call_id":"call_001"}
{"type":"function_call_output","call_id":"call_001","output":"{\\"success\\":true}"}
{"record_type":"state"}`;

// Newer event-based format
export const codexNewerFormat = `{"timestamp":"2024-01-01T10:00:00.000Z","type":"session_meta","payload":{"id":"test-session-999","timestamp":"2024-01-01T10:00:00.000Z","cwd":"/test/project","originator":"codex_exec","cli_version":"0.45.0","git":{"commit_hash":"def456","branch":"feature","repository_url":"git@github.com:test/repo.git"}}}
{"timestamp":"2024-01-01T10:00:01.000Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"List files"}]}}
{"timestamp":"2024-01-01T10:00:02.000Z","type":"turn_context","payload":{"cwd":"/test/project","model":"gpt-4-turbo"}}
{"timestamp":"2024-01-01T10:00:03.000Z","type":"response_item","payload":{"type":"reasoning","summary":[{"type":"summary_text","text":"Checking directory"}],"content":null,"encrypted_content":"encrypted"}}
{"timestamp":"2024-01-01T10:00:04.000Z","type":"response_item","payload":{"type":"function_call","name":"shell","arguments":"{\\"command\\":[\\"ls\\"]}","call_id":"call_002"}}
{"timestamp":"2024-01-01T10:00:05.000Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call_002","output":"{\\"output\\":\\"file1.txt\\\\nfile2.txt\\"}"}}`;
