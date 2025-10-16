"use client";

import {
  CodeBlock as AICodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";

interface CodeBlockProps {
  code: string;
  language: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <AICodeBlock
      code={code}
      language={language}
      showLineNumbers={language !== "text"}
    >
      <CodeBlockCopyButton />
    </AICodeBlock>
  );
}
