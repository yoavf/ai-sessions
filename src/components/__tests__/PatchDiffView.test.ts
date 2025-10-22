import { describe, expect, it } from "vitest";
import { parsePatch } from "@/lib/parsePatch";

/**
 * Tests for PatchDiffView component's patch parsing
 * These tests verify that Codex apply_patch formats are correctly parsed
 */

describe("PatchDiffView - parsePatch", () => {
  describe("Add File format", () => {
    it("should parse simple new file with single line", () => {
      const patch = `*** Begin Patch
*** Add File: test.txt
+Hello World
*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toEqual([
        {
          filePath: "test.txt",
          oldString: "",
          newString: "Hello World",
        },
      ]);
    });

    it("should parse new file with multiple lines", () => {
      const patch = `*** Begin Patch
*** Add File: index.html
+<!DOCTYPE html>
+<html>
+<head>
+  <title>Test</title>
+</head>
+<body>
+  <h1>Hello</h1>
+</body>
+</html>
*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toEqual([
        {
          filePath: "index.html",
          oldString: "",
          newString: `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`,
        },
      ]);
    });

    it("should parse new CSS file", () => {
      const patch = `*** Begin Patch
*** Add File: styles.css
+body {
+  margin: 0;
+  padding: 0;
+}
+
+.container {
+  max-width: 1200px;
+}
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("styles.css");
      expect(result[0].oldString).toBe("");
      expect(result[0].newString).toContain("body {");
      expect(result[0].newString).toContain("max-width: 1200px;");
    });

    it("should parse new JavaScript file", () => {
      const patch = `*** Begin Patch
*** Add File: script.js
+const DURATION = 25 * 60;
+
+function startTimer() {
+  console.log('Starting...');
+}
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("script.js");
      expect(result[0].oldString).toBe("");
      expect(result[0].newString).toContain("const DURATION");
      expect(result[0].newString).toContain("function startTimer()");
    });
  });

  describe("Update File format", () => {
    it("should parse simple file update with single change", () => {
      const patch = `*** Begin Patch
*** Update File: config.js
@@ -1,1 +1,1 @@
-const port = 3000;
+const port = 8080;
*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toEqual([
        {
          filePath: "config.js",
          oldString: "const port = 3000;",
          newString: "const port = 8080;",
        },
      ]);
    });

    it("should parse file update with context lines", () => {
      const patch = `*** Begin Patch
*** Update File: app.ts
@@ -1,3 +1,3 @@
 const express = require('express');
-const port = 3000;
+const port = process.env.PORT || 8080;
 const app = express();
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("app.ts");
      expect(result[0].oldString).toContain(
        "const express = require('express');",
      );
      expect(result[0].oldString).toContain("const port = 3000;");
      expect(result[0].oldString).toContain("const app = express();");
      expect(result[0].newString).toContain(
        "const express = require('express');",
      );
      expect(result[0].newString).toContain(
        "const port = process.env.PORT || 8080;",
      );
      expect(result[0].newString).toContain("const app = express();");
    });

    it("should parse file update with multiple chunks", () => {
      const patch = `*** Begin Patch
*** Update File: styles.css
@@ -1,5 +1,5 @@
 :root {
   color-scheme: light dark;
-  --bg: #101820;
+  --bg: #1a1a1a;
 }
@@ -7,3 +7,3 @@
 body {
   margin: 0;
-  background: var(--bg);
+  background: linear-gradient(var(--bg), #000);
 }
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("styles.css");
      expect(result[0].oldString).toContain("--bg: #101820;");
      expect(result[0].oldString).toContain("background: var(--bg);");
      expect(result[0].newString).toContain("--bg: #1a1a1a;");
      expect(result[0].newString).toContain(
        "background: linear-gradient(var(--bg), #000);",
      );
    });

    it("should parse file update with additions only", () => {
      const patch = `*** Begin Patch
*** Update File: script.js
@@ -1,3 +1,5 @@
 function init() {
   console.log('Starting');
+  setupEventListeners();
+  startTimer();
 }
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("script.js");
      expect(result[0].oldString).not.toContain("setupEventListeners");
      expect(result[0].oldString).not.toContain("startTimer");
      expect(result[0].newString).toContain("setupEventListeners();");
      expect(result[0].newString).toContain("startTimer();");
    });

    it("should parse file update with removals only", () => {
      const patch = `*** Begin Patch
*** Update File: utils.ts
@@ -1,5 +1,3 @@
 export function helper() {
-  console.log('debug');
-  debugger;
   return true;
 }
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("utils.ts");
      expect(result[0].oldString).toContain("console.log('debug');");
      expect(result[0].oldString).toContain("debugger;");
      expect(result[0].newString).not.toContain("console.log('debug');");
      expect(result[0].newString).not.toContain("debugger;");
      expect(result[0].newString).toContain("return true;");
    });

    it("should handle complex multi-line changes", () => {
      const patch = `*** Begin Patch
*** Update File: component.tsx
@@ -1,10 +1,12 @@
 export default function Component() {
-  const [count, setCount] = useState(0);
+  const [count, setCount] = useState<number>(0);
+  const [name, setName] = useState<string>('');

   return (
     <div>
-      <p>Count: {count}</p>
+      <h1>Count: {count}</h1>
+      <p>Name: {name}</p>
     </div>
   );
 }
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("component.tsx");
      expect(result[0].oldString).toContain(
        "const [count, setCount] = useState(0);",
      );
      expect(result[0].oldString).toContain("<p>Count: {count}</p>");
      expect(result[0].newString).toContain(
        "const [count, setCount] = useState<number>(0);",
      );
      expect(result[0].newString).toContain(
        "const [name, setName] = useState<string>('');",
      );
      expect(result[0].newString).toContain("<h1>Count: {count}</h1>");
      expect(result[0].newString).toContain("<p>Name: {name}</p>");
    });
  });

  describe("edge cases", () => {
    it("should return empty array for invalid patch format", () => {
      const patch = "not a valid patch";
      const result = parsePatch(patch);

      expect(result).toEqual([]);
    });

    it("should return empty array for missing Begin Patch marker", () => {
      const patch = `*** Add File: test.txt
+content
*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toEqual([]);
    });

    it("should return empty array for missing End Patch marker", () => {
      const patch = `*** Begin Patch
*** Add File: test.txt
+content`;

      const result = parsePatch(patch);

      expect(result).toEqual([]);
    });

    it("should handle patch with no file type marker", () => {
      const patch = `*** Begin Patch
+some content
-some other content
*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toEqual([]);
    });

    it("should handle empty patch body", () => {
      const patch = `*** Begin Patch

*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toEqual([]);
    });

    it("should preserve empty lines in context", () => {
      const patch = `*** Begin Patch
*** Update File: file.txt
@@ -1,5 +1,5 @@
 line1

-line3
+new line3

 line5
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].oldString).toContain("line1");
      expect(result[0].oldString).toContain("line3");
      expect(result[0].oldString).toContain("line5");
      expect(result[0].newString).toContain("line1");
      expect(result[0].newString).toContain("new line3");
      expect(result[0].newString).toContain("line5");
    });

    it("should handle file paths with directories", () => {
      const patch = `*** Begin Patch
*** Add File: src/components/Button.tsx
+export function Button() {
+  return <button>Click</button>;
+}
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].filePath).toBe("src/components/Button.tsx");
    });

    it("should handle special characters in file content", () => {
      const patch = `*** Begin Patch
*** Add File: regex.js
+const pattern = /[a-zA-Z]+/g;
+const special = "quotes";
*** End Patch`;

      const result = parsePatch(patch);

      expect(result[0].newString).toContain("/[a-zA-Z]+/g");
      expect(result[0].newString).toContain("quotes");
    });
  });

  describe("real-world Codex examples", () => {
    it("should parse Codex pomodoro timer CSS update", () => {
      // Actual patch from Codex transcript (simplified)
      const patch = `*** Begin Patch
*** Update File: styles.css
@@ -1,10 +1,17 @@
 :root {
   color-scheme: light dark;
   --bg: #101820;
   --card: #1c2a38;
   --accent: #ff6b6b;
   --accent-soft: rgba(255, 107, 107, 0.1);
   --text: #f5f5f5;
   --muted: #c5c5c5;
   --success: #4caf50;
   font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
 }
+
+body.work-mode {
+  --bg: #101820;
+  --card: #1c2a38;
+  --accent: #ff6b6b;
+  --accent-soft: rgba(255, 107, 107, 0.12);
+}
*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("styles.css");
      expect(result[0].oldString).toContain(":root {");
      expect(result[0].oldString).toContain("--bg: #101820;");
      expect(result[0].newString).toContain("body.work-mode {");
    });

    it("should parse Codex pomodoro timer script.js update", () => {
      const patch = `*** Begin Patch
*** Update File: script.js
@@ -10,6 +10,7 @@
 let completedSessions = 0;
 let alertTimeoutId = null;

+document.body.classList.add('work-mode');
 updateCountdown();
*** End Patch`;

      const result = parsePatch(patch);

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("script.js");
      expect(result[0].oldString).toContain("let alertTimeoutId = null;");
      expect(result[0].oldString).toContain("updateCountdown();");
      expect(result[0].oldString).not.toContain("document.body.classList.add");
      expect(result[0].newString).toContain(
        "document.body.classList.add('work-mode');",
      );
    });
  });
});
