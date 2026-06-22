"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  isUser?: boolean;
}

export default function CopyButton({ text, isUser = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copiar mensaje"
      className={cn(
        "rounded p-1 opacity-0 transition-opacity group-hover:opacity-100",
        "hover:bg-black/10",
        isUser
          ? "text-white/70 hover:text-white"
          : "text-[var(--muted)] hover:text-[var(--foreground)]",
      )}
    >
      {copied
        ? <Check size={13} strokeWidth={2.5} />
        : <Copy size={13} strokeWidth={2} />
      }
    </button>
  );
}
