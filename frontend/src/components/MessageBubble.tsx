"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

      <div className={cn(
          "group relative",
          isUser
            ? "max-w-[85%] sm:max-w-[78%] md:max-w-[70%] flex flex-col items-end"
            : "max-w-[95%] sm:max-w-[90%] md:max-w-[88%]",
        )}>
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
            <div className="prose prose-invert max-w-none prose-sm
              prose-p:my-1.5 prose-p:leading-relaxed
              prose-headings:font-semibold prose-headings:my-2
              prose-ul:my-1.5 prose-ol:my-1.5
              prose-li:my-0.5
              prose-pre:bg-[var(--background)] prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-2 prose-pre:overflow-x-auto
              prose-code:bg-[var(--background)] prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
              prose-table:w-full prose-table:border-collapse prose-table:my-3
              prose-th:border prose-th:border-[var(--border)] prose-th:bg-[var(--surface-hover)] prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold
              prose-td:border prose-td:border-[var(--border)] prose-td:px-3 prose-td:py-2 prose-td:text-xs
              prose-blockquote:border-l-2 prose-blockquote:border-[var(--accent)] prose-blockquote:pl-3 prose-blockquote:text-[var(--muted)] prose-blockquote:my-2
              prose-strong:text-[var(--foreground)] prose-strong:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content + (message.isStreaming ? "▋" : "")}
              </ReactMarkdown>
            </div>
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
