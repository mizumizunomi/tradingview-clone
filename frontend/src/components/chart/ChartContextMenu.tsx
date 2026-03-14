"use client";
import { useEffect, useRef } from "react";
import { Bell, Ruler, Trash2, Camera, Crosshair, TrendingUp } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";

interface Props {
  x: number;
  y: number;
  price: number;
  time: number;
  onClose: () => void;
  onScreenshot: () => void;
}

export function ChartContextMenu({ x, y, price, time, onClose, onScreenshot }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { setAlertModalContext, clearDrawings, setActiveTool, selectedAsset } = useTradingStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", keyHandler); };
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  const menuW = 200, menuH = 220;
  const adjustedX = x + menuW > window.innerWidth ? x - menuW : x;
  const adjustedY = y + menuH > window.innerHeight ? y - menuH : y;

  const items = [
    {
      icon: <Bell className="h-3.5 w-3.5 text-[#f59e0b]" />,
      label: "Add Alert Here",
      action: () => {
        setAlertModalContext(selectedAsset?.symbol || "BTCUSD", price);
        onClose();
      },
    },
    {
      icon: <Ruler className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />,
      label: "Measure",
      action: () => { setActiveTool("measure"); onClose(); },
    },
    {
      icon: <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />,
      label: "Draw Trendline",
      action: () => { setActiveTool("trendline"); onClose(); },
    },
    {
      icon: <Crosshair className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />,
      label: "Crosshair",
      action: () => { setActiveTool("crosshair"); onClose(); },
    },
    { divider: true },
    {
      icon: <Camera className="h-3.5 w-3.5" style={{ color: "var(--tv-muted)" }} />,
      label: "Save Screenshot",
      action: () => { onScreenshot(); onClose(); },
    },
    { divider: true },
    {
      icon: <Trash2 className="h-3.5 w-3.5 text-[#ef5350]" />,
      label: "Clear Drawings",
      action: () => { clearDrawings(); onClose(); },
      danger: true,
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-lg border py-1 shadow-2xl min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY, background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
    >
      <div className="px-3 py-1 text-[10px] font-semibold border-b mb-1" style={{ color: "var(--tv-muted)", borderColor: "var(--tv-border)" }}>
        {price.toFixed(4)} @ {new Date(time * 1000).toLocaleTimeString()}
      </div>
      {items.map((item, i) =>
        "divider" in item ? (
          <div key={i} className="my-1 border-t" style={{ borderColor: "var(--tv-border)" }} />
        ) : (
          <button
            key={i}
            onClick={item.action}
            className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--tv-bg3)] transition-colors"
            style={{ color: item.danger ? "#ef5350" : "var(--tv-text-light)" }}
          >
            {item.icon}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
