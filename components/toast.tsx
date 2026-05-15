"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";

/**
 * Tiny in-house toast system. Three reasons to not pull `sonner`:
 *  - the project already has @base-ui/react for accessibility primitives;
 *  - we only need 3 variants and auto-dismiss;
 *  - adding a dep for ~50 lines of code is overkill.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("저장됨");
 *   toast.error("실패: 네트워크");
 */

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastCtx {
  push: (variant: ToastVariant, message: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used within <ToastProvider />");
  return c;
}

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: string) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((curr) => [...curr, { id, variant, message }]);
      const timer = setTimeout(() => remove(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [remove]
  );

  // Clear all pending timers on unmount.
  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      for (const t of timersAtMount.values()) clearTimeout(t);
      timersAtMount.clear();
    };
  }, []);

  const value: ToastCtx = {
    push,
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const tone =
    item.variant === "success"
      ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-100"
      : item.variant === "error"
      ? "border-red-500/40 bg-red-950/80 text-red-100"
      : "border-zinc-700 bg-zinc-900/95 text-zinc-100";

  const Icon =
    item.variant === "success" ? Check : item.variant === "error" ? AlertCircle : Info;

  return (
    <div
      role={item.variant === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-2.5 max-w-sm rounded-lg border ${tone} px-3.5 py-2.5 text-sm shadow-xl backdrop-blur`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="opacity-50 hover:opacity-100"
        aria-label="알림 닫기"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
