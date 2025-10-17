"use client";

import { Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addCsrfToken, useCsrfToken } from "@/hooks/useCsrfToken";

interface TranscriptPageDropzoneProps {
	children: React.ReactNode;
	isAuthenticated: boolean;
}

export default function TranscriptPageDropzone({
	children,
	isAuthenticated,
}: TranscriptPageDropzoneProps) {
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const csrfToken = useCsrfToken();

	const handleUpload = useCallback(async () => {
		if (!pendingFile || !isAuthenticated) return;

		setUploading(true);
		setError(null);

		try {
			const text = await pendingFile.text();

			// Validate JSONL format
			const lines = text.trim().split("\n");
			for (const line of lines) {
				JSON.parse(line);
			}

			// Ensure we have a CSRF token
			if (!csrfToken) {
				setError(
					"Security token not loaded. Please refresh the page and try again.",
				);
				setUploading(false);
				setPendingFile(null);
				return;
			}

			const response = await fetch(
				"/api/transcripts",
				addCsrfToken(csrfToken, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fileData: text,
						title: pendingFile.name.replace(".jsonl", ""),
					}),
				}),
			);

			if (!response.ok) {
				const errorData = await response.json();

				// Handle sensitive data detection
				if (errorData.error === "Sensitive data detected") {
					setError(
						errorData.message ||
							"Your transcript contains sensitive information that should not be uploaded publicly.",
					);
					setUploading(false);
					setPendingFile(null);
					return;
				}

				throw new Error(errorData.error || "Upload failed");
			}

			const { secretToken } = await response.json();
			// Navigate to the new transcript
			window.location.href = `/t/${secretToken}`;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Invalid JSONL file");
			setUploading(false);
			setPendingFile(null);
		}
	}, [pendingFile, isAuthenticated, csrfToken]);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (!isAuthenticated) {
				setError("Please sign in to upload transcripts");
				return;
			}

			const file = acceptedFiles[0];
			if (!file) return;

			if (!file.name.endsWith(".jsonl")) {
				setError("Please upload a .jsonl file");
				return;
			}

			// Check file size (5MB limit)
			const maxSizeBytes = 5 * 1024 * 1024; // 5MB
			if (file.size > maxSizeBytes) {
				setError(
					`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the 5MB limit.`,
				);
				return;
			}

			setError(null);
			setPendingFile(file);
		},
		[isAuthenticated],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/x-jsonl": [".jsonl"],
			"application/json": [".jsonl"],
		},
		maxFiles: 1,
		disabled: uploading,
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
					<div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
						<div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-primary rounded-xl bg-primary/5">
							<Upload className="w-24 h-24 text-primary animate-bounce" />
							<div className="text-2xl font-semibold text-primary">
								Drop transcript here to upload
							</div>
							<div className="text-sm text-muted-foreground">
								Upload a new Claude Code transcript (.jsonl file)
							</div>
						</div>
					</div>
				)}

				{/* Uploading overlay */}
				{uploading && (
					<div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
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
			<AlertDialog open={!!pendingFile && !uploading} onOpenChange={() => {}}>
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
						<AlertDialogAction onClick={handleUpload}>
							Upload
						</AlertDialogAction>
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
