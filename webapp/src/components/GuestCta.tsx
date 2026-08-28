import Link from "next/link";
import { loginUrl } from "@/lib/auth/guest";

export function GuestCta({
  title,
  body,
  next,
}: {
  title: string;
  body: string;
  next?: string;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-white p-6 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-blue-soft text-lg">
        👋
      </div>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{body}</p>
      <Link href={loginUrl(next)} className="btn-primary mt-5 inline-block w-auto px-8">
        Log in to continue
      </Link>
      <p className="mt-3 text-xs text-ink-faint">Free account · Indian mobile number</p>
    </div>
  );
}
