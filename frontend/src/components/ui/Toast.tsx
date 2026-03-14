"use client";
import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Toast as ToastType } from "@/types";
import { useTradingStore } from "@/store/trading.store";

const ICONS = {
  success: <CheckCircle className="h-4 w-4 text-[#26a69a] shrink-0" />,
  error: <AlertCircle className="h-4 w-4 text-[#ef5350] shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-[#f59e0b] shrink-0" />,
  info: <Info className="h-4 w-4 text-[#2962ff] shrink-0" />,
};

const BAR_COLORS = {
  success: "#26a69a", error: "#ef5350", warning: "#f59e0b", info: "#2962ff",
};

export function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useTradingStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(100);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const step = 50;
    const decrement = (step / duration) * 100;
    const interval = setInterval(() => setWidth((w) => Math.max(0, w - decrement)), step);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div
      className="relative flex items-start gap-3 rounded-lg border px-4 py-3 shadow-xl min-w-[280px] max-w-[380px] overflow-hidden"
      style={{
        background: "var(--tv-bg2)",
        borderColor: "var(--tv-border)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "opacity 0.25s, transform 0.25s",
      }}
    >
      {ICONS[toast.type]}
      <span className="flex-1 text-xs leading-relaxed" style={{ color: "var(--tv-text-light)" }}>
        {toast.message}
      </span>
      <button onClick={() => removeToast(toast.id)} className="shrink-0 hover:opacity-70 transition-opacity mt-0.5">
        <X className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />
      </button>
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all"
        style={{ width: `${width}%`, background: BAR_COLORS[toast.type] }}
      />
    </div>
  );
}
