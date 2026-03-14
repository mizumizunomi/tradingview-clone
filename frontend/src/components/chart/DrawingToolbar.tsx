"use client";
import { useState, useRef } from "react";
import { useTradingStore, DrawingTool } from "@/store/trading.store";
import { cn } from "@/lib/utils";
import {
  MousePointer2, Crosshair, Minus, TrendingUp, MoveRight, ArrowRight,
  Square, Circle, Triangle, Trash2, Type, MessageSquare, Layers,
  GitBranch, ZoomIn, Magnet, BarChart2, ChevronRight, ChevronDown,
  Highlighter, CornerDownRight, Info, Target, Flag, Bookmark,
  LayoutTemplate
} from "lucide-react";

interface ToolGroup {
  label: string;
  icon: React.ReactNode;
  tools: { id: DrawingTool; label: string; icon: React.ReactNode; shortcut?: string }[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "Cursor",
    icon: <MousePointer2 className="h-4 w-4" />,
    tools: [
      { id: "cursor", label: "Move chart", icon: <MousePointer2 className="h-3.5 w-3.5" />, shortcut: "V" },
      { id: "crosshair", label: "Crosshair", icon: <Crosshair className="h-3.5 w-3.5" />, shortcut: "C" },
    ],
  },
  {
    label: "Lines",
    icon: <TrendingUp className="h-4 w-4" />,
    tools: [
      { id: "trendline", label: "Trend Line", icon: <TrendingUp className="h-3.5 w-3.5" />, shortcut: "Alt+T" },
      { id: "infoline", label: "Info Line", icon: <Info className="h-3.5 w-3.5" /> },
      { id: "ray", label: "Ray", icon: <MoveRight className="h-3.5 w-3.5" /> },
      { id: "extended", label: "Extended Line", icon: <ArrowRight className="h-3.5 w-3.5" /> },
      { id: "hline", label: "Horizontal Line", icon: <Minus className="h-3.5 w-3.5" />, shortcut: "Alt+H" },
      { id: "vline", label: "Vertical Line", icon: <Minus className="h-3.5 w-3.5 rotate-90" />, shortcut: "Alt+V" },
    ],
  },
  {
    label: "Channels",
    icon: <Layers className="h-4 w-4" />,
    tools: [
      { id: "parallelchannel", label: "Parallel Channel", icon: <Layers className="h-3.5 w-3.5" /> },
      { id: "channel", label: "Flat Top/Bottom", icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
      { id: "pitchfork", label: "Andrews' Pitchfork", icon: <GitBranch className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: "Fibonacci",
    icon: <span className="text-[11px] font-bold leading-none">Fib</span>,
    tools: [
      { id: "fibonacci", label: "Fibonacci Retracement", icon: <span className="text-[10px] font-bold">Fib</span>, shortcut: "Alt+F" },
      { id: "fibchannel", label: "Fibonacci Channel", icon: <span className="text-[10px]">FC</span> },
      { id: "fibarc", label: "Fibonacci Arc", icon: <span className="text-[10px]">FA</span> },
      { id: "fibwedge", label: "Fibonacci Wedge", icon: <span className="text-[10px]">FW</span> },
      { id: "fibtime", label: "Fibonacci Time Zone", icon: <span className="text-[10px]">FT</span> },
      { id: "fibspeed", label: "Trend-Based Fib Speed Resistance", icon: <span className="text-[10px]">FS</span> },
    ],
  },
  {
    label: "Shapes",
    icon: <Square className="h-4 w-4" />,
    tools: [
      { id: "rectangle", label: "Rectangle", icon: <Square className="h-3.5 w-3.5" />, shortcut: "Alt+R" },
      { id: "circle", label: "Circle", icon: <Circle className="h-3.5 w-3.5" /> },
      { id: "triangle", label: "Triangle", icon: <Triangle className="h-3.5 w-3.5" /> },
      { id: "wedge", label: "Wedge", icon: <CornerDownRight className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: "Annotations",
    icon: <Type className="h-4 w-4" />,
    tools: [
      { id: "text", label: "Text", icon: <Type className="h-3.5 w-3.5" /> },
      { id: "callout", label: "Callout", icon: <MessageSquare className="h-3.5 w-3.5" /> },
      { id: "note", label: "Note", icon: <Bookmark className="h-3.5 w-3.5" /> },
      { id: "brush", label: "Brush", icon: <Highlighter className="h-3.5 w-3.5" /> },
      { id: "arrow", label: "Arrow", icon: <ArrowRight className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: "Patterns",
    icon: <Flag className="h-4 w-4" />,
    tools: [
      { id: "longposition", label: "Long Position", icon: <Flag className="h-3.5 w-3.5 text-[#26a69a]" /> },
      { id: "shortposition", label: "Short Position", icon: <Flag className="h-3.5 w-3.5 text-[#ef5350]" /> },
      { id: "forecast", label: "Price Range", icon: <Target className="h-3.5 w-3.5" /> },
      { id: "measure", label: "Measure", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    ],
  },
];

export function DrawingToolbar() {
  const { activeTool, setActiveTool, clearDrawings } = useTradingStore();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number }>({ top: 0 });
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeGroup = TOOL_GROUPS.find((g) => g.tools.some((t) => t.id === activeTool));

  const handleGroupClick = (group: ToolGroup, idx: number) => {
    if (openGroup === group.label) {
      setOpenGroup(null);
    } else {
      const el = groupRefs.current[group.label];
      if (el) {
        const rect = el.getBoundingClientRect();
        setFlyoutPos({ top: rect.top });
      }
      setOpenGroup(group.label);
    }
  };

  const handleToolSelect = (tool: DrawingTool) => {
    setActiveTool(tool);
    setOpenGroup(null);
  };

  return (
    <div
      className="flex flex-col items-center py-1 border-r shrink-0 relative z-10"
      style={{
        width: 36,
        background: "var(--tv-bg2)",
        borderColor: "var(--tv-border)",
      }}
      onMouseLeave={() => setOpenGroup(null)}
    >
      {TOOL_GROUPS.map((group, idx) => {
        const isGroupActive = group.tools.some((t) => t.id === activeTool);
        const currentTool = group.tools.find((t) => t.id === activeTool) || group.tools[0];
        const displayIcon = isGroupActive ? currentTool.icon : group.icon;

        return (
          <div
            key={group.label}
            ref={(el) => { groupRefs.current[group.label] = el; }}
            className="relative w-full flex justify-center"
          >
            <button
              title={group.label}
              onClick={() => handleGroupClick(group, idx)}
              className={cn(
                "flex items-center justify-center w-[28px] h-[28px] rounded my-0.5 transition-colors relative group",
                isGroupActive
                  ? "bg-[#2962ff] text-white"
                  : "text-[var(--tv-muted)] hover:bg-[var(--tv-bg3)] hover:text-[var(--tv-text-light)]"
              )}
            >
              {displayIcon}
              {group.tools.length > 1 && (
                <ChevronRight className="absolute right-0 bottom-0 h-2 w-2 opacity-40" />
              )}
            </button>

            {/* Flyout */}
            {openGroup === group.label && (
              <div
                className="absolute left-full ml-1 z-50 rounded-lg py-1 shadow-xl border min-w-[180px]"
                style={{
                  top: 0,
                  background: "var(--tv-bg2)",
                  borderColor: "var(--tv-border)",
                }}
              >
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tv-muted)" }}>
                  {group.label}
                </div>
                {group.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-xs transition-colors",
                      activeTool === tool.id
                        ? "bg-[#2962ff20] text-[#4d7cff]"
                        : "hover:bg-[var(--tv-bg3)]"
                    )}
                    style={{ color: activeTool === tool.id ? "#4d7cff" : "var(--tv-text-light)" }}
                  >
                    <span className="opacity-70">{tool.icon}</span>
                    <span className="flex-1">{tool.label}</span>
                    {tool.shortcut && (
                      <span className="text-[10px]" style={{ color: "var(--tv-muted)" }}>{tool.shortcut}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Divider */}
      <div className="w-5 my-1 border-t" style={{ borderColor: "var(--tv-border)" }} />

      {/* Magnet */}
      <button
        title="Magnet Mode"
        className="flex items-center justify-center w-[28px] h-[28px] rounded my-0.5 transition-colors"
        style={{ color: "var(--tv-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tv-bg3)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      >
        <Magnet className="h-3.5 w-3.5" />
      </button>

      {/* Erase all */}
      <button
        title="Clear all drawings"
        onClick={clearDrawings}
        className="flex items-center justify-center w-[28px] h-[28px] rounded my-0.5 transition-colors"
        style={{ color: "var(--tv-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tv-bg3)"; e.currentTarget.style.color = "#ef5350"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--tv-muted)"; }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
