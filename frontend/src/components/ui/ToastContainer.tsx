"use client";
import { createPortal } from "react-dom";
import { useTradingStore } from "@/store/trading.store";
import { ToastItem } from "./Toast";
import { useEffect, useState } from "react";

export function ToastContainer() {
  const toasts = useTradingStore((s) => s.toasts);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>,
    document.body
  );
}
