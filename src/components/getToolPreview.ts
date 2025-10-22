import { makeRelativePath } from "@/lib/path-utils";

/**
 * Get a preview string for a tool call to display in the UI
 * This function extracts the most relevant information from tool inputs
 * to show in collapsed tool headers
 */
export function getToolPreview(
  toolName: string,
  // biome-ignore lint/suspicious/noExplicitAny: Tool input types are dynamic
  input: Record<string, any>,
  cwd?: string,
): string | null {
  switch (toolName) {
    case "Read":
      return input.file_path ? makeRelativePath(input.file_path, cwd) : null;

    case "Write":
    case "write_file": // Gemini's write tool
    case "Edit":
    case "replace": // Gemini's edit tool
      return input.file_path ? makeRelativePath(input.file_path, cwd) : null;

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

    case "update_plan":
      if (input.plan && Array.isArray(input.plan)) {
        return `${input.plan.length} step${input.plan.length !== 1 ? "s" : ""}`;
      }
      return null;

    case "shell": {
      // Codex shell tool
      if (!input.command) return null;

      // Parse command - it's usually an array like ["bash", "-lc", "actual command"]
      let actualCommand: string;
      if (Array.isArray(input.command)) {
        // Skip "bash", "-lc" and get the actual command
        const filtered = input.command.filter(
          (arg: string) => arg !== "bash" && arg !== "-lc",
        );
        actualCommand = filtered.join(" ");
      } else if (typeof input.command === "string") {
        actualCommand = input.command;
      } else {
        return null;
      }

      // Get first line if multiline
      const firstLine = actualCommand.trim().split("\n")[0];

      // For commands, get first ~60 chars or until &&, ||, |, ;
      const breakPoints = /[&|;]/;
      const breakIndex = firstLine.search(breakPoints);
      const displayCmd =
        breakIndex !== -1
          ? firstLine.substring(0, breakIndex).trim()
          : firstLine;

      return displayCmd.length > 60
        ? `${displayCmd.substring(0, 60)}...`
        : displayCmd;
    }

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
          // Convert paths to relative for path-like fields
          if (field === "path" || field === "file_path") {
            return makeRelativePath(input[field], cwd);
          }
          return input[field];
        }
      }
      return null;
    }
  }
}
