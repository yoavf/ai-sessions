"use client";

import { Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranscriptUpload } from "@/hooks/useTranscriptUpload";

interface TranscriptPageDropzoneProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  csrfToken: string;
}

export default function TranscriptPageDropzone({
  children,
  isAuthenticated,
  csrfToken,
}: TranscriptPageDropzoneProps) {
  const { uploading, error, setError, uploadTranscript } = useTranscriptUpload(
    isAuthenticated,
    csrfToken,
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleUpload = useCallback(async () => {
    if (!pendingFile) {
      console.warn("handleUpload called with no pending file");
      return;
    }

    if (!isAuthenticated) {
      console.error("Session expired during upload", {
        fileName: pendingFile.name,
      });
      setPendingFile(null);
      setError(
        "Your session has expired. Please refresh the page and sign in again.",
      );
      return;
    }

    const result = await uploadTranscript(pendingFile);

    if (result.success && result.secretToken) {
      // Navigate to the new transcript
      window.location.href = `/t/${result.secretToken}`;
    } else if (result.error) {
      setError(result.error);
      setPendingFile(null);
    }
  }, [pendingFile, isAuthenticated, uploadTranscript, setError]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Basic validation for better UX
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

      setError(null);
      setPendingFile(file);
    },
    [setError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/x-jsonl": [".jsonl"],
      "application/json": [".json", ".jsonl"],
    },
    maxFiles: 1,
    disabled: uploading || !isAuthenticated,
    noClick: true, // Don't open file dialog on click
    noKeyboard: true, // Don't respond to keyboard
  });

  return (
    <>
      <div {...getRootProps()} className="relative min-h-screen">
        <input {...getInputProps()} />
        {children}

        {/* Invisible overlay that only shows when dragging .jsonl files */}
        {isDragActive && (
          <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
            role="dialog"
            aria-live="polite"
            aria-label="Drop transcript here to upload"
          >
            <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-primary rounded-xl bg-primary/5">
              <Upload className="w-24 h-24 text-primary animate-bounce" />
              <div className="text-2xl font-semibold text-primary">
                Drop transcript here to upload
              </div>
              <div className="text-sm text-muted-foreground">
                Upload a new transcript (JSON or JSONL file)
              </div>
            </div>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          // biome-ignore lint/a11y/useSemanticElements: <output> is for calculation results, not loading states
          <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
            role="status"
            aria-live="polite"
            aria-label="Uploading transcript"
          >
            <div className="flex flex-col items-center gap-6 py-4">
              <Loader2 className="w-24 h-24 text-primary animate-spin" />
              <div className="w-full max-w-md space-y-3">
                <div className="text-2xl font-semibold text-center">
                  Processing Transcript
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  Creating your shareable link...
                </div>
                <div className="w-full h-2 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-indeterminate-progress w-1/4" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog
        open={!!pendingFile && !uploading}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFile(null);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upload New Transcript?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to upload <strong>{pendingFile?.name}</strong>. This
              will create a new transcript and navigate to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingFile(null);
                setError(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpload}>Upload</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error alert */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md z-50">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
