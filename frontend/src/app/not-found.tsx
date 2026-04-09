import Link from "next/link";
import { Home, BarChart2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#131722] text-[#d1d4dc]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2962ff]">
        <BarChart2 className="h-8 w-8 text-white" />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-3">404</h1>
        <p className="text-sm text-[#5d6673]">This page does not exist.</p>
      </div>
      <Link
        href="/trade"
        className="flex items-center gap-1.5 rounded-lg bg-[#2962ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d6fff] transition-colors"
      >
        <Home className="h-4 w-4" />
        Return to trading
      </Link>
    </div>
  );
}
