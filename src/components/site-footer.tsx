import { Github } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <span>•</span>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span>Built by</span>
            <Link
              href="https://github.com/yoavf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
            >
              <Github className="h-4 w-4" />
              @yoavf
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
