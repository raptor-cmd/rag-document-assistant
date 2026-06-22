import Dropzone from "@/components/Dropzone";
import ChatWindow from "@/components/ChatWindow";
import MobileTabs from "@/components/MobileTabs";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="shrink-0 border-b border-[var(--border)] px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)] md:text-base">
              RAG Document Assistant
            </h1>
            <p className="hidden text-xs text-[var(--muted)] sm:block">
              Upload PDFs · Ask questions · Get answers
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
            GPT-4o mini
          </span>
        </div>
      </header>

      {/* Mobile layout — tabs */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        <MobileTabs />
      </div>

      {/* Desktop layout — side by side */}
      <div className="mx-auto hidden w-full max-w-5xl flex-1 overflow-hidden md:flex">
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
