/**
 * Simplified Mistral Vibe session for testing
 * Based on real Mistral Vibe log format
 */

export const MISTRAL_VIBE_SAMPLE = JSON.stringify({
  metadata: {
    session_id: "test-session-123",
    start_time: "2025-12-10T20:34:09.851367",
    end_time: "2025-12-10T20:38:20.448625",
    environment: {
      working_directory: "/test/project",
    },
    git_branch: "main",
    stats: {
      session_prompt_tokens: 1000,
      session_completion_tokens: 500,
      session_total_llm_tokens: 1500,
    },
    agent_config: {
      active_model: "devstral-2",
      models: [
        {
          name: "mistral-vibe-cli-latest",
          alias: "devstral-2",
        },
      ],
    },
  },
  messages: [
    {
      role: "user",
      content: "Hello, can you help me with this project?",
    },
    {
      role: "assistant",
      content:
        "Sure, I can help with that. Let me analyze the project structure.",
      tool_calls: [
        {
          id: "tool-1",
          type: "function",
          function: {
            name: "read_file",
            arguments: JSON.stringify({
              path: "package.json",
              timestamp: "2025-12-10T20:35:15.123456",
            }),
          },
        },
      ],
    },
    {
      role: "user",
      content: "Here's the package.json content",
      tool_call_results: [
        {
          tool_call_id: "tool-1",
          content: '{"name": "test-project", "version": "1.0.0"}',
        },
      ],
    },
    {
      role: "assistant",
      content:
        "I see this is a test project. Would you like me to analyze it further?",
    },
  ],
});
