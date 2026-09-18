export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <section className="relative mx-auto max-w-3xl px-5 pb-16 pt-10">
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Sanyuj</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">Last updated: {updated}</p>
          <article className="legal-prose mt-8 space-y-8 text-[15px] leading-relaxed text-ink-soft">
            {children}
          </article>
        </div>
  </section>;
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
