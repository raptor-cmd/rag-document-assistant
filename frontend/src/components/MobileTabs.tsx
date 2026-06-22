"use client";

import { useState } from "react";
import { FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import Dropzone from "@/components/Dropzone";
import ChatWindow from "@/components/ChatWindow";

type Tab = "documents" | "chat";

export default function MobileTabs() {
  const [active, setActive] = useState<Tab>("chat");

  return (
    <div className="flex h-full flex-col">
      <nav className="flex shrink-0 border-b border-[var(--border)]">
        {(["chat", "documents"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              active === tab
                ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {tab === "chat" ? (
              <MessageSquare size={15} />
            ) : (
              <FileText size={15} />
            )}
            {tab === "chat" ? "Chat" : "Documents"}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        {active === "chat" ? (
          <div className="flex h-full flex-col p-3">
            <ChatWindow />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Documents
            </p>
            <p className="mb-4 text-xs text-[var(--muted)]">
              Index a PDF to search over its content
            </p>
            <Dropzone />
          </div>
        )}
      </div>
    </div>
  );
}
