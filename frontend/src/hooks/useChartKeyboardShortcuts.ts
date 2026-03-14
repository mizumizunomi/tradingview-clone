"use client";
import { useEffect } from "react";
import { useTradingStore } from "@/store/trading.store";

export function useChartKeyboardShortcuts() {
  const setActiveTool = useTradingStore((s) => s.setActiveTool);
  const undoDrawing = useTradingStore((s) => s.undoDrawing);
  const setSelectedDrawingId = useTradingStore((s) => s.setSelectedDrawingId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") { setActiveTool("cursor"); setSelectedDrawingId(null); }
      else if (e.key === "v" || e.key === "V") setActiveTool("cursor");
      else if (e.key === "c" && !e.ctrlKey && !e.metaKey) setActiveTool("crosshair");
      else if (e.altKey && e.key === "t") { e.preventDefault(); setActiveTool("trendline"); }
      else if (e.altKey && e.key === "h") { e.preventDefault(); setActiveTool("hline"); }
      else if (e.altKey && e.key === "v") { e.preventDefault(); setActiveTool("vline"); }
      else if (e.altKey && e.key === "r") { e.preventDefault(); setActiveTool("rectangle"); }
      else if (e.altKey && e.key === "f") { e.preventDefault(); setActiveTool("fibonacci"); }
      else if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undoDrawing(); }
      else if (e.key === "Delete" || e.key === "Backspace") {
        const sel = useTradingStore.getState().selectedDrawingId;
        if (sel) { useTradingStore.getState().removeDrawing(sel); setSelectedDrawingId(null); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
