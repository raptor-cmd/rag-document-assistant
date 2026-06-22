import Dropzone from "@/components/Dropzone";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <main className="flex h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="shrink-0 border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
              RAG Document Assistant
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Upload PDFs · Ask questions · Get answers
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
            Powered by GPT-4o mini
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col gap-4 border-r border-[var(--border)] p-5">
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Documents
            </h2>
            <p className="mb-4 text-xs text-[var(--muted)]">
              Index a PDF to search over its content
            </p>
            <Dropzone />
          </div>
        </aside>

        <section className="flex flex-1 flex-col overflow-hidden p-4">
          <ChatWindow />
        </section>
      </div>
    </main>
  );
}
