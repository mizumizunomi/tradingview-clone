"use client";
import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";

const SHORTCUTS = [
  { category: "Tools", items: [
    { key: "V", desc: "Move / Cursor tool" },
    { key: "C", desc: "Crosshair" },
    { key: "Alt+T", desc: "Trendline" },
    { key: "Alt+H", desc: "Horizontal line" },
    { key: "Alt+V", desc: "Vertical line" },
    { key: "Alt+R", desc: "Rectangle" },
    { key: "Alt+F", desc: "Fibonacci retracement" },
    { key: "Escape", desc: "Back to cursor" },
  ]},
  { category: "Chart", items: [
    { key: "Ctrl+Z", desc: "Undo last drawing" },
    { key: "Delete", desc: "Delete selected drawing" },
    { key: "?", desc: "Show this help" },
  ]},
  { category: "Navigation", items: [
    { key: "Alt+Enter", desc: "Toggle full screen chart" },
  ]},
];

export function KeyboardShortcutsModal() {
  const { showKeyboardShortcuts, setShowKeyboardShortcuts } = useTradingStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        setShowKeyboardShortcuts(true);
      }
      if (e.key === "Escape") setShowKeyboardShortcuts(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!showKeyboardShortcuts) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "#00000088" }}
      onClick={() => setShowKeyboardShortcuts(false)}>
      <div className="rounded-xl border shadow-2xl w-[480px] max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--tv-border)" }}>
          <Keyboard className="h-4 w-4 text-[#2962ff]" />
          <span className="font-semibold text-sm" style={{ color: "var(--tv-text-light)" }}>Keyboard Shortcuts</span>
          <button onClick={() => setShowKeyboardShortcuts(false)} className="ml-auto p-1 rounded hover:bg-[var(--tv-bg3)]"
            style={{ color: "var(--tv-muted)" }}><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--tv-muted)" }}>{section.category}</div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <span className="text-xs" style={{ color: "var(--tv-text)" }}>{item.desc}</span>
                    <kbd className="text-[10px] px-2 py-0.5 rounded border font-mono"
                      style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}>
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
