"use client";

import { useState } from "react";

interface CollapsibleTextProps {
  text: string;
  maxLines?: number;
  className?: string;
  isUser?: boolean;
}

export default function CollapsibleText({
  text,
  maxLines = 20,
  className = "",
  isUser = false,
}: CollapsibleTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count the number of lines in the text
  const lines = text.split("\n");
  const shouldCollapse = lines.length > maxLines;

  if (!shouldCollapse) {
    return <p className={`whitespace-pre-wrap ${className}`}>{text}</p>;
  }

  const displayText = isExpanded ? text : lines.slice(0, maxLines).join("\n");

  // Style classes based on whether it's a user or assistant message
  const borderClass = isUser ? "border-blue-300" : "border-gray-300";
  const buttonClass = isUser
    ? "text-white hover:text-blue-100 hover:underline"
    : "text-blue-600 hover:text-blue-800 hover:underline";

  return (
    <div className="space-y-2">
      <p className={`whitespace-pre-wrap ${className}`}>{displayText}</p>
      {!isExpanded && (
        <div className={`border-t ${borderClass} pt-2`}>
          <button
            onClick={() => setIsExpanded(true)}
            className={`text-sm ${buttonClass} flex items-center gap-1`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            Show {lines.length - maxLines} more line
            {lines.length - maxLines !== 1 ? "s" : ""}
          </button>
        </div>
      )}
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className={`text-sm ${buttonClass} flex items-center gap-1`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
          Show less
        </button>
      )}
    </div>
  );
}
