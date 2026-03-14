"use client";
import { useTradingStore } from "@/store/trading.store";
import { Trash2, Lock, Unlock, Eye, EyeOff, Minus } from "lucide-react";

const COLORS = ["#2962ff","#ef5350","#26a69a","#f59e0b","#9c27b0","#ff9800","#00bcd4","#ffffff","#b2b5be","#5d6673"];
const WIDTHS = [1, 2, 3] as const;
const STYLES = ["solid", "dashed", "dotted"] as const;

export function DrawingPropertiesBar() {
  const { selectedDrawingId, drawings, updateDrawing, removeDrawing, setSelectedDrawingId } = useTradingStore();
  const drawing = drawings.find((d) => d.id === selectedDrawingId);
  if (!drawing) return null;

  return (
    <div
      className="fixed z-30 flex items-center gap-1 rounded-lg border px-3 py-1.5 shadow-xl"
      style={{
        top: 54,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--tv-bg2)",
        borderColor: "var(--tv-border)",
      }}
    >
      {/* Color swatches */}
      <div className="flex gap-1 items-center mr-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => updateDrawing(drawing.id, { color: c })}
            className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              background: c,
              borderColor: drawing.color === c ? "white" : "transparent",
            }}
          />
        ))}
      </div>

      <div className="w-px h-5 mx-1" style={{ background: "var(--tv-border)" }} />

      {/* Line width */}
      {WIDTHS.map((w) => (
        <button
          key={w}
          onClick={() => updateDrawing(drawing.id, { lineWidth: w })}
          className="flex items-center justify-center w-7 h-7 rounded transition-colors"
          style={{
            background: drawing.lineWidth === w ? "var(--tv-bg3)" : "transparent",
            color: "var(--tv-text)",
          }}
          title={`Width ${w}`}
        >
          <div className="rounded" style={{ width: 14, height: w, background: "currentColor" }} />
        </button>
      ))}

      <div className="w-px h-5 mx-1" style={{ background: "var(--tv-border)" }} />

      {/* Line style */}
      {STYLES.map((s) => (
        <button
          key={s}
          onClick={() => updateDrawing(drawing.id, { style: s })}
          className="flex items-center justify-center w-7 h-7 rounded transition-colors"
          style={{
            background: drawing.style === s || (!drawing.style && s === "solid") ? "var(--tv-bg3)" : "transparent",
            color: "var(--tv-text)",
          }}
          title={s}
        >
          <svg width="14" height="2">
            <line
              x1="0" y1="1" x2="14" y2="1"
              stroke="currentColor" strokeWidth="2"
              strokeDasharray={s === "dashed" ? "4,2" : s === "dotted" ? "1,3" : "none"}
            />
          </svg>
        </button>
      ))}

      <div className="w-px h-5 mx-1" style={{ background: "var(--tv-border)" }} />

      {/* Lock */}
      <button
        onClick={() => updateDrawing(drawing.id, { locked: !drawing.locked })}
        className="flex items-center justify-center w-7 h-7 rounded transition-colors"
        style={{ color: drawing.locked ? "#f59e0b" : "var(--tv-muted)" }}
        title={drawing.locked ? "Unlock" : "Lock"}
      >
        {drawing.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>

      {/* Visibility */}
      <button
        onClick={() => updateDrawing(drawing.id, { visible: drawing.visible === false ? true : false })}
        className="flex items-center justify-center w-7 h-7 rounded transition-colors"
        style={{ color: "var(--tv-muted)" }}
        title={drawing.visible === false ? "Show" : "Hide"}
      >
        {drawing.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>

      <div className="w-px h-5 mx-1" style={{ background: "var(--tv-border)" }} />

      {/* Delete */}
      <button
        onClick={() => { removeDrawing(drawing.id); setSelectedDrawingId(null); }}
        className="flex items-center justify-center w-7 h-7 rounded transition-colors text-[#ef5350] hover:bg-[#ef535020]"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Close bar */}
      <button
        onClick={() => setSelectedDrawingId(null)}
        className="ml-1 text-[10px] px-1.5 py-0.5 rounded"
        style={{ color: "var(--tv-muted)", background: "var(--tv-bg3)" }}
      >
        ✕
      </button>
    </div>
  );
}
