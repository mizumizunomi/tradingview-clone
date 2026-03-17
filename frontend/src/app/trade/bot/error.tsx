"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Bot page error:", error);
  }, [error]);

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8"
      style={{ background: "#131722" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertCircle className="h-12 w-12" style={{ color: "#ef5350" }} />
        <h2 className="text-xl font-semibold" style={{ color: "#d1d4dc" }}>
          Bot Dashboard Error
        </h2>
        <p className="max-w-sm text-sm" style={{ color: "#787b86" }}>
          {error.message || "An unexpected error occurred while loading the trading bot."}
        </p>
        {error.digest && (
          <p className="text-xs font-mono" style={{ color: "#505050" }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
        style={{ background: "#ef5350", color: "#ffffff" }}
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
