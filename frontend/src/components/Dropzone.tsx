"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocument } from "@/lib/api";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
  chunks?: number;
  filename?: string;
}

interface DropzoneProps {
  onIndexed?: (documentId: string, filename: string) => void;
}

export default function Dropzone({ onIndexed }: DropzoneProps = {}) {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setState({ status: "uploading", filename: file.name });

    try {
      const result = await uploadDocument(file);
      setState({
        status: "success",
        message: result.message,
        chunks: result.chunks_stored,
        filename: result.filename,
      });
      onIndexed?.(result.document_id, result.filename);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Upload failed",
        filename: file.name,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: state.status === "uploading",
  });

  const reset = () => setState({ status: "idle" });

  return (
    <div className="w-full space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 sm:p-8 transition-all duration-200 cursor-pointer",
          "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]",
          isDragActive && "border-[var(--accent)] bg-[var(--surface-hover)] scale-[1.01]",
          state.status === "uploading" && "cursor-not-allowed opacity-60",
        )}
      >
        <input {...getInputProps()} />

        {state.status === "uploading" ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
            <p className="text-sm text-[var(--muted)]">
              Processing <span className="text-[var(--foreground)]">{state.filename}</span>…
            </p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-hover)]">
              <Upload className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {isDragActive ? "Drop your PDF here" : "Drop a PDF here, or click to select"}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">PDF only · max 10 MB</p>
            </div>
          </>
        )}
      </div>

      {state.status === "success" && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--success)]">Indexed successfully</p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              <FileText className="mr-1 inline h-3 w-3" />
              {state.filename} · {state.chunks} chunks stored
            </p>
          </div>
          <button
            onClick={reset}
            className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Upload another file"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--error)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--error)]">Upload failed</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{state.message}</p>
          </div>
          <button
            onClick={reset}
            className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
