"use client";

import { useCallback, useState } from "react";
import { addCsrfToken } from "@/hooks/useCsrfToken";

interface UploadResult {
  success: boolean;
  secretToken?: string;
  error?: string;
}

interface UseTranscriptUploadReturn {
  uploading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  uploadTranscript: (file: File) => Promise<UploadResult>;
}

export function useTranscriptUpload(
  isAuthenticated: boolean,
  csrfToken: string,
): UseTranscriptUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadTranscript = useCallback(
    async (file: File): Promise<UploadResult> => {
      if (!isAuthenticated) {
        console.error("Upload attempted while not authenticated", {
          fileName: file.name,
          fileSize: file.size,
        });
        return {
          success: false,
          error: "Please sign in to upload transcripts",
        };
      }

      // Validate file extension
      if (!file.name.endsWith(".jsonl") && !file.name.endsWith(".json")) {
        return {
          success: false,
          error: "Please upload a .json or .jsonl transcript file",
        };
      }

      // Validate file size (5MB limit)
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return {
          success: false,
          error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the 5MB limit.`,
        };
      }

      setUploading(true);
      setError(null);

      try {
        // Read file content
        let text: string;
        try {
          text = await file.text();
        } catch (readError) {
          console.error("Failed to read file:", readError, {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          });
          setUploading(false);
          return {
            success: false,
            error:
              "Failed to read file. The file may be corrupted or too large.",
          };
        }

        // Validate JSON/JSONL format
        try {
          const trimmed = text.trim();

          // Try parsing as single JSON object first (Gemini format)
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
              JSON.parse(trimmed);
              // Valid single JSON object - no further validation needed
            } catch {
              // Not a valid single JSON object, try JSONL validation
              const lines = trimmed.split("\n");
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; // Skip empty lines

                try {
                  JSON.parse(line);
                } catch (lineError) {
                  console.error(
                    `JSONL validation failed at line ${i + 1}:`,
                    lineError,
                    {
                      lineContent: line.substring(0, 100),
                      fileName: file.name,
                    },
                  );
                  setUploading(false);
                  return {
                    success: false,
                    error: `Invalid JSON at line ${i + 1}: ${lineError instanceof Error ? lineError.message : "Parse error"}. Content: ${line.substring(0, 50)}...`,
                  };
                }
              }
            }
          } else {
            // Not a single JSON object, validate as JSONL
            const lines = trimmed.split("\n");
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue; // Skip empty lines

              try {
                JSON.parse(line);
              } catch (lineError) {
                console.error(
                  `JSONL validation failed at line ${i + 1}:`,
                  lineError,
                  {
                    lineContent: line.substring(0, 100),
                    fileName: file.name,
                  },
                );
                setUploading(false);
                return {
                  success: false,
                  error: `Invalid JSON at line ${i + 1}: ${lineError instanceof Error ? lineError.message : "Parse error"}. Content: ${line.substring(0, 50)}...`,
                };
              }
            }
          }
        } catch (validationError) {
          console.error("JSON/JSONL validation error:", validationError, {
            fileName: file.name,
            fileSize: file.size,
          });
          setUploading(false);
          return {
            success: false,
            error:
              validationError instanceof Error
                ? validationError.message
                : "Invalid JSON/JSONL file",
          };
        }

        // Generate safe title (handle edge case of file named exactly ".jsonl" or ".json")
        const rawTitle = file.name.replace(/\.(jsonl|json)$/i, "");
        const title = rawTitle.substring(0, 200) || "Untitled";

        // Upload to API
        const response = await fetch(
          "/api/transcripts",
          addCsrfToken(csrfToken, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileData: text,
              title: title,
            }),
          }),
        );

        if (!response.ok) {
          let errorData: { error?: string; message?: string };
          try {
            errorData = await response.json();
          } catch (jsonError) {
            console.error("Failed to parse error response:", jsonError, {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
            });
            setUploading(false);
            return {
              success: false,
              error: `Upload failed with status ${response.status}: ${response.statusText}`,
            };
          }

          // Log all API errors with full context
          console.error("Upload API error:", {
            status: response.status,
            statusText: response.statusText,
            errorData,
            fileName: file.name,
            fileSize: file.size,
            rateLimitHeaders: {
              limit: response.headers.get("X-RateLimit-Limit"),
              remaining: response.headers.get("X-RateLimit-Remaining"),
            },
          });

          // Handle CSRF token validation failure
          if (
            response.status === 403 &&
            errorData.error === "Invalid CSRF token"
          ) {
            setUploading(false);
            return {
              success: false,
              error:
                errorData.message ||
                "CSRF token validation failed. Please refresh the page and try again.",
            };
          }

          // Handle sensitive data detection
          if (errorData.error === "Sensitive data detected") {
            setUploading(false);
            return {
              success: false,
              error:
                errorData.message ||
                "Your transcript contains sensitive information that should not be uploaded publicly.",
            };
          }

          // Handle rate limiting with specific message
          if (response.status === 429) {
            const limit = response.headers.get("X-RateLimit-Limit");
            setUploading(false);
            return {
              success: false,
              error:
                errorData.message ||
                `Rate limit exceeded. You can upload up to ${limit || 10} transcripts per hour.`,
            };
          }

          setUploading(false);
          return {
            success: false,
            error: errorData.error || `Upload failed (${response.status})`,
          };
        }

        // Parse success response
        let secretToken: string;
        try {
          const data = await response.json();
          secretToken = data.secretToken;

          if (!secretToken) {
            throw new Error("Server response missing secretToken");
          }
        } catch (parseError) {
          console.error("Failed to parse success response:", parseError, {
            fileName: file.name,
            status: response.status,
          });
          setUploading(false);
          return {
            success: false,
            error:
              "Upload may have succeeded but received invalid response. Please check your transcript list.",
          };
        }

        // Don't set uploading to false on success - keep the animation
        // showing until redirect completes for better UX
        return { success: true, secretToken };
      } catch (err) {
        // Catch any unexpected errors
        console.error("Unexpected upload error:", err, {
          fileName: file.name,
          fileSize: file.size,
          isAuthenticated,
          hasCsrfToken: !!csrfToken,
        });

        setUploading(false);

        if (err instanceof Error) {
          // Provide specific error messages based on error type
          if (err.message.includes("JSON")) {
            return {
              success: false,
              error: `Invalid JSONL file: ${err.message}`,
            };
          }
          if (
            err.message.includes("fetch") ||
            err.message.includes("network")
          ) {
            return {
              success: false,
              error:
                "Network error. Please check your connection and try again.",
            };
          }
          return { success: false, error: `Upload failed: ${err.message}` };
        }

        return {
          success: false,
          error: "An unexpected error occurred during upload",
        };
      }
    },
    [isAuthenticated, csrfToken],
  );

  return { uploading, error, setError, uploadTranscript };
}
