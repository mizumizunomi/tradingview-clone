"use client";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div
      className="fixed bottom-2 right-2 z-50 flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium shadow-lg"
      style={{
        background: "var(--tv-bg2)",
        border: "1px solid var(--tv-border)",
        color: "var(--tv-muted)",
      }}
      title={connected ? "Live prices connected" : "Connecting… Prices may still load via REST."}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          connected ? "bg-[#26a69a]" : "animate-pulse bg-[#f59e0b]"
        )}
      />
      {connected ? "Live" : "Connecting…"}
    </div>
  );
}
