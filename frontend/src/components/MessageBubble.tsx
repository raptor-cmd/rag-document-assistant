"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import CopyButton from "@/components/CopyButton";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const canCopy = !message.isStreaming && message.content.length > 0;

  return (
    <div className={cn("flex w-full gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isUser
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--surface-hover)] text-[var(--muted)]",
        )}
        aria-hidden
      >
        {isUser ? "U" : "AI"}
      </div>

      <div className={cn("group relative max-w-[80%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-[var(--accent)] text-white"
              : "rounded-tl-sm bg-[var(--surface)] text-[var(--foreground)]",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock ? (
                    <code className="block overflow-x-auto rounded-md bg-[var(--background)] p-3 text-xs font-mono mt-2 mb-2">
                      {children}
                    </code>
                  ) : (
                    <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs font-mono">
                      {children}
                    </code>
                  );
                },
                ul: ({ children }) => (
                  <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
              }}
            >
              {message.content + (message.isStreaming ? "▋" : "")}
            </ReactMarkdown>
          )}
        </div>

        {canCopy && (
          <div className={cn(
            "mt-1 flex",
            isUser ? "justify-end pr-1" : "justify-start pl-1",
          )}>
            <CopyButton text={message.content} isUser={isUser} />
          </div>
        )}
      </div>
    </div>
  );
}
