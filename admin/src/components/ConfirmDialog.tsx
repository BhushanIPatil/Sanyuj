"use client";

import { AlertTriangle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmCtx = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const Ctx = createContext<ConfirmCtx>({
  confirm: async () => false,
});

type DialogState = ConfirmOptions & {
  open: boolean;
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, open: true, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {dialog?.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4">
          <div
            className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-pop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                  dialog.tone === "danger" ? "bg-rose-soft text-rose" : "bg-amber-soft text-amber"
                }`}
              >
                <AlertTriangle size={20} />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="font-display text-lg font-bold">
                  {dialog.title}
                </h2>
                <p id="confirm-message" className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {dialog.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => close(false)}
              >
                {dialog.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-[18px] px-4 py-3 text-sm font-bold text-white shadow-card ${
                  dialog.tone === "danger"
                    ? "bg-rose hover:opacity-90"
                    : "grad-hero"
                }`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  return useContext(Ctx);
}
