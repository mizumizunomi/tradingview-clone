"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#131722] text-[#d1d4dc]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ef535020]">
        <AlertTriangle className="h-8 w-8 text-[#ef5350]" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-[#5d6673] max-w-xs">{error.message || "An unexpected error occurred."}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg bg-[#2962ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d6fff] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <button
          onClick={() => router.push("/trade")}
          className="flex items-center gap-1.5 rounded-lg border border-[#363a45] px-4 py-2 text-sm text-[#b2b5be] hover:text-white transition-colors"
        >
          <Home className="h-4 w-4" />
          Go home
        </button>
      </div>
    </div>
  );
}
