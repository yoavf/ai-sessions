"use client";

import { useCallback, useEffect, useState } from "react";

interface TOCItem {
  uuid: string;
  text: string;
  index: number;
}

interface FloatingTOCProps {
  items: TOCItem[];
}

export default function FloatingTOC({ items }: FloatingTOCProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUuid, setActiveUuid] = useState<string | null>(null);

  // Track scroll position to highlight active message
  useEffect(() => {
    if (items.length === 0) return;

    const handleScroll = () => {
      // Find the message closest to the top of the viewport
      let closestUuid: string | null = null;
      let closestDistance = Infinity;

      for (const item of items) {
        const el = document.getElementById(`message-${item.uuid}`);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestUuid = item.uuid;
        }
      }

      if (closestUuid) {
        setActiveUuid(closestUuid);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener("scroll", handleScroll);
  }, [items]);

  const handleItemClick = useCallback((uuid: string, e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(`message-${uuid}`);
    if (element) {
      // Update URL with hash
      window.history.pushState(null, "", `#message-${uuid}`);
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: Floating collapsible button (< lg) */}
      <div className="lg:hidden fixed right-4 top-24 z-20 max-w-xs">
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg shadow-lg hover:bg-muted/50 transition-colors"
          title={isOpen ? "Hide table of contents" : "Show table of contents"}
        >
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="text-sm font-medium text-foreground">
            {items.length} message{items.length !== 1 ? "s" : ""}
          </span>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* TOC Panel (mobile) */}
        {isOpen && (
          <div className="mt-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden max-h-[calc(100vh-200px)]">
            <div className="px-3 py-2 bg-muted border-b border-border">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Table of Contents
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
              {items.map((item, index) => (
                <a
                  key={item.uuid}
                  href={`#message-${item.uuid}`}
                  onClick={(e) => handleItemClick(item.uuid, e)}
                  className={`block w-full text-left px-3 py-2 text-sm border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                    activeUuid === item.uuid
                      ? "bg-muted border-l-4 border-l-primary"
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-xs font-medium text-muted-foreground mt-0.5">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-foreground line-clamp-2 leading-tight">
                      {item.text}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Sticky sidebar (>= lg) - Always visible */}
      <div className="hidden lg:block h-full">
        <div className="bg-background border-l overflow-hidden h-full flex flex-col">
          <div className="overflow-y-auto flex-1">
            {items.map((item, index) => (
              <a
                key={item.uuid}
                href={`#message-${item.uuid}`}
                onClick={(e) => handleItemClick(item.uuid, e)}
                className={`block w-full text-left px-3 py-1.5 text-xs border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                  activeUuid === item.uuid
                    ? "bg-muted border-l-2 border-l-primary"
                    : "border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground mt-0.5 min-w-[1.25rem]">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-foreground line-clamp-1 leading-snug">
                    {item.text}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
