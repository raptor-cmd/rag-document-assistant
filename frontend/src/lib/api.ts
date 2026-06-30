const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface UploadResult {
  message: string;
  filename: string;
  chunks_stored: number;
  document_id: string;
}

export interface DocumentMatch {
  id: string;
  content: string;
  similarity: number;
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/v1/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Upload failed");
  }

  return res.json();
}

export interface StreamCallbacks {
  onSources: (sources: DocumentMatch[]) => void;
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function queryDocuments(
  query: string,
  callbacks: StreamCallbacks,
  matchCount = 5,
  matchThreshold = 0.5,
  documentIds: string[] = [],
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      match_count: matchCount,
      match_threshold: matchThreshold,
      document_ids: documentIds,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    callbacks.onError(new Error(error.detail ?? "Query failed"));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          callbacks.onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data) as { type: string; data: string };
          if (parsed.type === "sources") {
            const sources = JSON.parse(parsed.data) as DocumentMatch[];
            callbacks.onSources(sources);
          } else if (parsed.type === "token") {
            callbacks.onToken(parsed.data);
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
    callbacks.onDone();
  }
}
