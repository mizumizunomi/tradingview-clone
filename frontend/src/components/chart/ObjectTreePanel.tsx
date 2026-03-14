"use client";
import { X, Eye, EyeOff, Lock, Unlock, Trash2, Layers } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";

const TOOL_LABELS: Record<string, string> = {
  trendline: "Trend Line", ray: "Ray", extended: "Extended Line", infoline: "Info Line",
  hline: "Horizontal Line", vline: "Vertical Line", rectangle: "Rectangle", circle: "Circle",
  fibonacci: "Fibonacci", parallelchannel: "Parallel Channel", text: "Text",
  arrow: "Arrow", longposition: "Long Position", shortposition: "Short Position",
  measure: "Measure", triangle: "Triangle", wedge: "Wedge", brush: "Brush",
};

export function ObjectTreePanel() {
  const { showObjectTree, setShowObjectTree, drawings, updateDrawing, removeDrawing, selectedDrawingId, setSelectedDrawingId } = useTradingStore();
  if (!showObjectTree) return null;

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-20 flex flex-col border-l shadow-2xl"
      style={{ width: 220, background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--tv-border)" }}>
        <Layers className="h-4 w-4" style={{ color: "var(--tv-muted)" }} />
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--tv-text-light)" }}>
          Objects ({drawings.length})
        </span>
        <button onClick={() => setShowObjectTree(false)} className="p-0.5 rounded hover:bg-[var(--tv-bg3)]">
          <X className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
            <Layers className="h-8 w-8 opacity-20" style={{ color: "var(--tv-muted)" }} />
            <span className="text-xs" style={{ color: "var(--tv-muted)" }}>No drawings yet</span>
          </div>
        ) : (
          drawings.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelectedDrawingId(d.id === selectedDrawingId ? null : d.id)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b group transition-colors"
              style={{
                borderColor: "var(--tv-border)",
                background: d.id === selectedDrawingId ? "#2962ff15" : "transparent",
              }}
              onMouseEnter={(e) => { if (d.id !== selectedDrawingId) e.currentTarget.style.background = "var(--tv-bg3)"; }}
              onMouseLeave={(e) => { if (d.id !== selectedDrawingId) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Color dot */}
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              {/* Label */}
              <span className="flex-1 text-xs truncate" style={{ color: "var(--tv-text-light)" }}>
                {TOOL_LABELS[d.tool] || d.tool}
              </span>
              {/* Actions */}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); updateDrawing(d.id, { visible: d.visible === false ? true : false }); }}
                  className="p-1 rounded hover:bg-[var(--tv-bg3)]"
                >
                  {d.visible === false
                    ? <EyeOff className="h-3 w-3" style={{ color: "var(--tv-muted)" }} />
                    : <Eye className="h-3 w-3" style={{ color: "var(--tv-muted)" }} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateDrawing(d.id, { locked: !d.locked }); }}
                  className="p-1 rounded hover:bg-[var(--tv-bg3)]"
                >
                  {d.locked
                    ? <Lock className="h-3 w-3 text-[#f59e0b]" />
                    : <Unlock className="h-3 w-3" style={{ color: "var(--tv-muted)" }} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeDrawing(d.id); if (selectedDrawingId === d.id) setSelectedDrawingId(null); }}
                  className="p-1 rounded hover:bg-[var(--tv-bg3)] text-[#ef5350]"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
