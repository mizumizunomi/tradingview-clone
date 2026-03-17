"use client";

export function BotSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg h-24"
            style={{ background: "#1e222d" }}
          />
        ))}
      </div>

      {/* Two section boxes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="rounded-lg h-48"
          style={{ background: "#1e222d" }}
        />
        <div
          className="rounded-lg h-48"
          style={{ background: "#1e222d" }}
        />
      </div>

      {/* Signal feed placeholder */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded h-12"
            style={{ background: "#1e222d" }}
          />
        ))}
      </div>
    </div>
  );
}
