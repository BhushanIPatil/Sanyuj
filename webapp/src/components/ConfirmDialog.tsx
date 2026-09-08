"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

type ConfirmState = ConfirmOptions & {
  open: boolean;
};

const ConfirmCtx = createContext<ConfirmFn>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        tone: options.tone ?? "default",
      });
    });
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, state.open]);

  const value = useMemo(() => confirm, [confirm]);
  const danger = state.tone === "danger";

  return (
    <ConfirmCtx.Provider value={value}>
      {children}
      <div
        className={`fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center ${
          state.open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!state.open}
      >
        <button
          type="button"
          aria-label="Dismiss"
          className={`absolute inset-0 bg-ink/40 transition-opacity ${
            state.open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => close(false)}
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sanyuj-confirm-title"
          aria-describedby={state.message ? "sanyuj-confirm-message" : undefined}
          className={`relative w-full max-w-sm rounded-[22px] border border-line bg-white p-5 shadow-pop transition-all sm:p-6 ${
            state.open
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-3 scale-[0.98] opacity-0"
          }`}
        >
          <h2
            id="sanyuj-confirm-title"
            className="font-display text-lg font-extrabold text-ink"
          >
            {state.title}
          </h2>
          {state.message ? (
            <p
              id="sanyuj-confirm-message"
              className="mt-2 text-sm leading-relaxed text-ink-soft"
            >
              {state.message}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => close(false)}
              className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink-soft transition hover:border-ink-faint hover:text-ink"
            >
              {state.cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:opacity-95 ${
                danger ? "bg-rose" : "grad-hero"
              }`}
            >
              {state.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmCtx);
}
