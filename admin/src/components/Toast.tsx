"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastCtx = { showToast: (msg: string) => void };

const Ctx = createContext<ToastCtx>({ showToast: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  const showToast = useCallback((text: string) => {
    setMsg(text);
    setOpen(true);
    window.setTimeout(() => setOpen(false), 2200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className={`fixed bottom-8 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-[16px] bg-ink px-4 py-3.5 text-sm font-semibold text-white shadow-pop transition-all ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green" />
        {msg}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
