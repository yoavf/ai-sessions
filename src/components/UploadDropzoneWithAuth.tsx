"use client";

import { Loader2, Lock, Upload } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranscriptUpload } from "@/hooks/useTranscriptUpload";

interface UploadDropzoneWithAuthProps {
  isAuthenticated: boolean;
  csrfToken: string;
}

export default function UploadDropzoneWithAuth({
  isAuthenticated,
  csrfToken,
}: UploadDropzoneWithAuthProps) {
  const { uploading, error, setError, uploadTranscript } = useTranscriptUpload(
    isAuthenticated,
    csrfToken,
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!isAuthenticated) {
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Show validation errors immediately
      if (!file.name.endsWith(".jsonl") && !file.name.endsWith(".json")) {
        setError("Please upload a .json or .jsonl transcript file");
        return;
      }

      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setError(
          `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the 5MB limit.`,
        );
        return;
      }

      // Upload immediately (no confirmation dialog on homepage)
      const result = await uploadTranscript(file);

      if (result.success && result.secretToken) {
        window.location.href = `/t/${result.secretToken}`;
      } else if (result.error) {
        setError(result.error);
      }
    },
    [isAuthenticated, uploadTranscript, setError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/x-jsonl": [".jsonl"],
      "application/json": [".json", ".jsonl"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="relative w-full">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
          transition-all duration-300 shadow-sm
          ${
            isDragActive
              ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
              : "border-border hover:border-primary/60 bg-gradient-to-br from-card to-muted/20 hover:shadow-md"
          }
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}
          ${!isAuthenticated ? "cursor-pointer" : ""}
        `}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none opacity-50" />

        <input {...getInputProps()} />
        <div className="relative z-10">
          {uploading ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <Loader2 className="relative w-24 h-24 text-primary animate-spin" />
              </div>
              <div className="w-full max-w-md space-y-3">
                <div className="text-2xl font-semibold text-center">
                  Processing Transcript
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  Creating your shareable link...
                </div>
                <div className="w-full h-2.5 bg-primary/15 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary animate-indeterminate-progress w-1/4 shadow-lg" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className={`relative transition-all duration-300 ${isDragActive ? "scale-110" : ""}`}>
                <div className={`absolute inset-0 rounded-full blur-2xl transition-opacity ${isDragActive ? "opacity-30 bg-primary" : "opacity-0"}`} />
                <Upload className={`relative w-20 h-20 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              {isDragActive ? (
                <div className="text-xl font-semibold text-primary animate-fade-in">
                  Drop your file here
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xl font-semibold">Drop your transcript</div>
                  <div className="text-sm text-muted-foreground">
                    or click to browse for a JSON or JSONL file
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      .json
                    </span>
                    <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      .jsonl
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Max 5MB
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground/80 pt-4">
                    By uploading, you agree to the site's{" "}
                    <Link
                      href="/terms"
                      className="text-primary hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md rounded-2xl flex items-center justify-center animate-fade-in-scale">
          <div className="text-center p-8 relative">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3">Sign in to upload</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Authenticate with GitHub to start sharing your AI coding sessions
            </p>
            <Button
              onClick={() => signIn("github", { callbackUrl: "/" })}
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              Sign in with GitHub
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
