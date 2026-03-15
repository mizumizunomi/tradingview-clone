"use client";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div
      className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium shadow-lg transition-opacity duration-200"
      style={{
        background: "var(--tv-bg2)",
        border: "1px solid var(--tv-border)",
        color: "var(--tv-muted)",
      }}
      title={connected ? "Live prices connected" : "Connecting… Prices may still load via REST."}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full transition-colors duration-200",
          connected ? "bg-[var(--tv-green)]" : "animate-pulse bg-[var(--tv-yellow)]"
        )}
      />
      {connected ? "Live" : "Connecting…"}
    </div>
  );
}
