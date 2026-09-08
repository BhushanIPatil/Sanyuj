export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="font-display text-xl font-bold">{title}</h1>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
