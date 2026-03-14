"use client";
import { useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, StepBack, StepForward, X } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";

interface Props { totalCandles: number; }

export function ReplayControls({ totalCandles }: Props) {
  const { replayMode, replayIndex, replayPlaying, replaySpeed,
    setReplayMode, setReplayIndex, setReplayPlaying } = useTradingStore() as any;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const speed = replaySpeed ?? 500;

  useEffect(() => {
    if (replayPlaying) {
      intervalRef.current = setInterval(() => {
        const idx = useTradingStore.getState().replayIndex;
        if (idx >= totalCandles - 1) {
          useTradingStore.getState().setReplayPlaying(false);
        } else {
          useTradingStore.getState().setReplayIndex(idx + 1);
        }
      }, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [replayPlaying, speed, totalCandles]);

  if (!replayMode) return null;

  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full border shadow-2xl"
      style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
    >
      <span className="text-[10px] font-semibold text-[#f59e0b] mr-1">REPLAY</span>

      <button onClick={() => setReplayIndex(0)} className="p-1 rounded hover:bg-[var(--tv-bg3)]" title="Go to start">
        <SkipBack className="h-3.5 w-3.5" style={{ color: "var(--tv-text)" }} />
      </button>
      <button onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))} className="p-1 rounded hover:bg-[var(--tv-bg3)]" title="Step back">
        <StepBack className="h-3.5 w-3.5" style={{ color: "var(--tv-text)" }} />
      </button>

      <button
        onClick={() => setReplayPlaying(!replayPlaying)}
        className="p-1.5 rounded-full bg-[#2962ff] text-white hover:bg-[#1e4dd8] transition-colors"
      >
        {replayPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <button onClick={() => setReplayIndex(Math.min(totalCandles - 1, replayIndex + 1))} className="p-1 rounded hover:bg-[var(--tv-bg3)]" title="Step forward">
        <StepForward className="h-3.5 w-3.5" style={{ color: "var(--tv-text)" }} />
      </button>
      <button onClick={() => setReplayIndex(totalCandles - 1)} className="p-1 rounded hover:bg-[var(--tv-bg3)]" title="Go to end">
        <SkipForward className="h-3.5 w-3.5" style={{ color: "var(--tv-text)" }} />
      </button>

      {/* Scrubber */}
      <input
        type="range"
        min={10}
        max={totalCandles}
        value={replayIndex}
        onChange={(e) => setReplayIndex(parseInt(e.target.value))}
        className="w-36 mx-1"
      />
      <span className="text-[10px] font-mono w-16 text-center" style={{ color: "var(--tv-muted)" }}>
        {replayIndex}/{totalCandles}
      </span>

      {/* Speed */}
      <select
        value={speed}
        onChange={(e) => useTradingStore.setState({ replaySpeed: parseInt(e.target.value) } as any)}
        className="text-[10px] rounded px-1 py-0.5 border outline-none"
        style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }}
      >
        <option value={1000}>0.5×</option>
        <option value={500}>1×</option>
        <option value={250}>2×</option>
        <option value={100}>5×</option>
      </select>

      <button
        onClick={() => setReplayMode(false)}
        className="p-1 rounded hover:bg-[var(--tv-bg3)] ml-1"
        title="Exit replay"
      >
        <X className="h-3.5 w-3.5 text-[#ef5350]" />
      </button>
    </div>
  );
}
