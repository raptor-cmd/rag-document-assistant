"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryDocuments, type DocumentMatch } from "@/lib/api";
import MessageBubble, { type Message } from "./MessageBubble";

let messageCounter = 0;
function nextId() {
  return `msg-${++messageCounter}`;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<DocumentMatch[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleSubmit = useCallback(async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    setInput("");
    setSources([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: nextId(), role: "user", content: query };
    const assistantId = nextId();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    await queryDocuments(query, {
      onSources: (s) => setSources(s),
      onToken: (token) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + token } : m,
          ),
        ),
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsLoading(false);
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
              : m,
          ),
        );
        setIsLoading(false);
      },
    });
  }, [input, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-1 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Ask anything about your documents
            </p>
            <p className="text-xs text-[var(--muted)]">
              Upload a PDF above, then ask a question here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {sources.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <p className="mb-1.5 text-xs font-medium text-[var(--muted)]">
            Sources ({sources.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <span
                key={s.id}
                title={s.content}
                className="inline-flex items-center rounded-full bg-[var(--surface-hover)] px-2.5 py-0.5 text-xs text-[var(--muted)]"
              >
                {Math.round(s.similarity * 100)}% match
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 focus-within:border-[var(--accent)] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents… (Enter to send)"
            rows={1}
            disabled={isLoading}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]",
              "outline-none leading-relaxed",
              isLoading && "opacity-50",
            )}
            style={{ minHeight: "24px", maxHeight: "160px" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
              input.trim() && !isLoading
                ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                : "bg-[var(--surface-hover)] text-[var(--muted)] cursor-not-allowed",
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-[var(--muted)]">
          Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
