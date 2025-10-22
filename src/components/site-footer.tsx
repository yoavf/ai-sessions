"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteFooter() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              <span className="hidden sm:inline">Terms of Service</span>
              <span className="sm:hidden">Terms</span>
            </Link>
            <span>•</span>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              <span className="hidden sm:inline">Privacy Policy</span>
              <span className="sm:hidden">Privacy</span>
            </Link>
            <span>•</span>
            <Link
              href="/changelog"
              className="hover:text-foreground transition-colors"
            >
              Changelog
            </Link>
            <span>•</span>
            <ThemeToggle />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button variant="outline" size="sm" asChild className="h-8">
              <Link
                href="https://github.com/yoavf/ai-sessions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                <Star className="h-4 w-4" />
                Star on GitHub
              </Link>
            </Button>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="hidden sm:inline">Inspired by</span>
              <Link
                href="https://ampcode.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors font-medium hidden sm:inline"
              >
                Amp
              </Link>
              <span className="hidden sm:inline">•</span>
              <span>Built by</span>
              <Link
                href="https://github.com/yoavf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
              >
                @yoavf
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
