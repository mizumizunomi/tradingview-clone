"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTradingStore } from "@/store/trading.store";

export default function Home() {
  const router = useRouter();
  const token = useTradingStore((s) => s.token);

  useEffect(() => {
    if (token) {
      router.replace("/trade");
    } else {
      router.replace("/auth/login");
    }
  }, [token, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#131722]">
      <div className="text-[#b2b5be]">Loading...</div>
    </div>
  );
}
