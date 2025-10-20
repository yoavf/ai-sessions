import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import UploadDropzoneWithAuth from "@/components/UploadDropzoneWithAuth";
import { auth } from "@/lib/auth";
import { getCsrfToken } from "@/lib/csrf";
import { Code2, Share2, Shield, Sparkles } from "lucide-react";

export default async function Home() {
  const session = await auth();

  // CSRF token is guaranteed to exist because middleware ensures it
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    throw new Error("CSRF token missing - middleware may not be running");
  }

  return (
    <div className="flex-1 bg-background">
      <SiteHeader session={session} />

      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Share Your AI Coding Journey
              </div>
              <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                AI Sessions
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-3 max-w-2xl mx-auto">
                Upload, share, and collaborate on AI coding sessions
              </p>
              <p className="text-base text-muted-foreground/70">
                Supports Claude Code, Codex, and Gemini CLI transcripts
              </p>
            </div>

            <UploadDropzoneWithAuth
              isAuthenticated={!!session}
              csrfToken={csrfToken}
            />

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Need help finding your transcripts?{" "}
                <Link href="/help" className="text-primary hover:underline font-medium">
                  Check out the help page
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 animate-fade-in">
            Why AI Sessions?
          </h2>
          <div className="grid md:grid-cols-3 gap-6 animate-stagger">
            {/* Feature 1 */}
            <div className="group relative p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 animate-slide-in-up">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <Code2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Multiple AI Tools</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload transcripts from Claude Code, Codex, or Gemini CLI. All formats supported.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 animate-slide-in-up">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <Share2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Sharing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get an instant shareable link. No authentication required to view shared transcripts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 animate-slide-in-up">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sensitive data detection with Google DLP. Your sessions are secured with secret URLs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
