/**
 * Sample Gemini CLI session for testing
 * This is a minimal valid Gemini session with key features:
 * - User and Gemini messages
 * - Thoughts (thinking blocks)
 * - Tool calls with results
 * - Model tracking
 */

export const geminiSample = `{
  "sessionId": "f86f5318-f47b-4433-85f8-ec9d9a417f8e",
  "projectHash": "79b6fa86e3c0d31765c7e3c6de511a7b96342a2e947135d5db396e49e27020cd",
  "startTime": "2025-10-18T14:57:28.974Z",
  "lastUpdated": "2025-10-18T14:58:07.161Z",
  "messages": [
    {
      "id": "91ff4a35-0f7b-492d-8a04-ee206be11ec6",
      "timestamp": "2025-10-18T14:57:28.974Z",
      "type": "user",
      "content": "List the files in the current directory"
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
          "args": {
            "path": "/Users/test/project"
          },
          "result": [
            {
              "functionResponse": {
                "id": "list_directory-1760799451650-5979488a89c64",
                "name": "list_directory",
                "response": {
                  "output": "Directory listing for /Users/test/project:\\n[DIR] src\\n[DIR] tests\\npackage.json\\nREADME.md"
                }
              }
            }
          ],
          "status": "success",
          "timestamp": "2025-10-18T14:57:31.684Z",
          "resultDisplay": "Listed 4 item(s)",
          "displayName": "ReadFolder",
          "description": "Lists the names of files and subdirectories"
        }
      ],
      "thoughts": [
        {
          "subject": "Analyzing Directory Structure",
          "description": "I've started by examining the directory structure to understand the project layout. This will help me provide better assistance.",
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
    },
    {
      "id": "9405b4aa-f4ef-4f44-86b4-afdb82cb130d",
      "timestamp": "2025-10-18T14:57:34.332Z",
      "type": "gemini",
      "content": "I can see that this is a Node.js project with source code in the src directory.",
      "model": "gemini-2.5-pro",
      "tokens": {
        "input": 8500,
        "output": 15,
        "cached": 8000,
        "thoughts": 0,
        "tool": 0,
        "total": 8515
      }
    },
    {
      "id": "user-response-123",
      "timestamp": "2025-10-18T14:57:40.000Z",
      "type": "user",
      "content": "Great! Can you read the README?"
    },
    {
      "id": "gemini-response-456",
      "timestamp": "2025-10-18T14:57:45.000Z",
      "type": "gemini",
      "content": "",
      "toolCalls": [
        {
          "id": "read_file-1760799465000-abc123",
          "name": "read_file",
          "args": {
            "absolute_path": "/Users/test/project/README.md"
          },
          "result": [
            {
              "functionResponse": {
                "id": "read_file-1760799465000-abc123",
                "name": "read_file",
                "response": {
                  "output": "# Test Project\\n\\nThis is a test project for demonstrating Gemini CLI parsing."
                }
              }
            }
          ],
          "status": "success",
          "timestamp": "2025-10-18T14:57:45.000Z"
        }
      ],
      "thoughts": [
        {
          "subject": "Reading Documentation",
          "description": "I'm accessing the README to understand the project's purpose and structure.",
          "timestamp": "2025-10-18T14:57:44.500Z"
        }
      ],
      "model": "gemini-2.0-flash",
      "tokens": {
        "input": 9000,
        "output": 30,
        "cached": 8500,
        "thoughts": 18,
        "tool": 0,
        "total": 9048
      }
    },
    {
      "id": "test-many-results",
      "timestamp": "2025-10-18T14:58:00.000Z",
      "type": "gemini",
      "content": "",
      "toolCalls": [
        {
          "id": "read_many_files-12345",
          "name": "read_many_files",
          "args": {
            "paths": ["file1.txt", "file2.txt"]
          },
          "result": [
            {
              "functionResponse": {
                "id": "read_many_files-12345",
                "name": "read_many_files",
                "response": {
                  "output": "Tool execution succeeded."
                }
              }
            },
            {
              "text": "--- file1.txt ---\\nContent of file 1"
            },
            {
              "text": "--- file2.txt ---\\nContent of file 2"
            }
          ],
          "status": "success",
          "timestamp": "2025-10-18T14:58:00.000Z"
        }
      ],
      "model": "gemini-2.5-pro"
    }
  ]
}`;

/**
 * Minimal Gemini session for detection testing
 */
export const minimalGeminiSample = `{
  "sessionId": "test-session-123",
  "projectHash": "abc123",
  "startTime": "2025-10-18T10:00:00.000Z",
  "lastUpdated": "2025-10-18T10:05:00.000Z",
  "messages": [
    {
      "id": "msg-1",
      "timestamp": "2025-10-18T10:00:00.000Z",
      "type": "user",
      "content": "Hello"
    },
    {
      "id": "msg-2",
      "timestamp": "2025-10-18T10:00:05.000Z",
      "type": "gemini",
      "content": "Hello! How can I help you?",
      "model": "gemini-2.5-pro"
    }
  ]
}`;

/**
 * Gemini session with thoughts but no tool calls
 */
export const geminiWithThoughtsOnly = `{
  "sessionId": "thoughts-session",
  "projectHash": "xyz789",
  "startTime": "2025-10-18T11:00:00.000Z",
  "lastUpdated": "2025-10-18T11:01:00.000Z",
  "messages": [
    {
      "id": "msg-1",
      "timestamp": "2025-10-18T11:00:00.000Z",
      "type": "user",
      "content": "Explain how async/await works"
    },
    {
      "id": "msg-2",
      "timestamp": "2025-10-18T11:00:30.000Z",
      "type": "gemini",
      "content": "Async/await is a way to handle asynchronous operations in JavaScript.",
      "thoughts": [
        {
          "subject": "Considering Explanation Strategy",
          "description": "I should provide a clear, concise explanation with examples.",
          "timestamp": "2025-10-18T11:00:25.000Z"
        }
      ],
      "model": "gemini-2.5-pro"
    }
  ]
}`;
