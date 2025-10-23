import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Changelog - AI Sessions",
  description:
    "View the changelog for AI Sessions - All notable changes organized by date.",
};

export default async function ChangelogPage() {
  const session = await auth();

  // Read the CHANGELOG.md file
  let changelogContent = "";
  try {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    changelogContent = await fs.readFile(changelogPath, "utf-8");
  } catch (error) {
    console.error("Failed to read CHANGELOG.md:", error);
    changelogContent = "# Changelog\n\nNo changelog available yet.";
  }

  // Remove the first line (# Changelog) from content since we'll show it as page title
  const contentWithoutTitle = changelogContent.replace(/^# Changelog\n+/, "");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader session={session} />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl font-bold tracking-tight font-mono mb-4">
              changelog
            </h1>
          </div>

          <article className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => (
                  <h2
                    className="text-2xl font-semibold mt-0 first:mt-0 mb-4 border-b pb-2"
                    {...props}
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 className="text-xl font-semibold mt-6 mb-3" {...props}>
                    {children}
                  </h3>
                ),
                p: ({ children, ...props }) => (
                  <p className="text-muted-foreground mb-4" {...props}>
                    {children}
                  </p>
                ),
                ul: ({ children, ...props }) => (
                  <ul className="list-none space-y-2 mb-6" {...props}>
                    {children}
                  </ul>
                ),
                li: ({ children, ...props }) => (
                  <li className="text-sm" {...props}>
                    {children}
                  </li>
                ),
                a: ({ children, ...props }) => (
                  <a
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                ),
                strong: ({ children, ...props }) => (
                  <strong className="font-semibold text-foreground" {...props}>
                    {children}
                  </strong>
                ),
              }}
            >
              {contentWithoutTitle}
            </Markdown>
          </article>
        </div>
      </div>
    </div>
  );
}
