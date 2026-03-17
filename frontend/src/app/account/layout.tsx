"use client";
import { SideNav } from "@/components/layout/SideNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#131722" }}>
      <SideNav />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
