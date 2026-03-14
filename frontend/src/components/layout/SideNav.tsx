"use client";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, Newspaper, Wallet, Info, Gem, LogOut, Calendar, Filter } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";

const NAV_ITEMS = [
  { icon: BarChart2, label: "Trade", href: "/trade" },
  { icon: Newspaper, label: "News", href: "/news" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Filter, label: "Screener", href: "/screener" },
  { icon: Gem, label: "Plans", href: "/plans" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Info, label: "About", href: "/about" },
];

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setToken, setUser } = useTradingStore();

  const handleLogout = () => { setToken(null); setUser(null); router.push("/auth/login"); };

  return (
    <div className="flex flex-col items-center border-r py-2" style={{ width: 48, background: "var(--tv-bg)", borderColor: "var(--tv-border)" }}>
      {/* Logo */}
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#2962ff]">
        <BarChart2 className="h-4 w-4 text-white" />
      </div>
      <div className="w-6 border-t mb-2" style={{ borderColor: "var(--tv-border)" }} />

      {/* Nav items */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              title={label}
              className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all"
              style={isActive ? { background: "#2962ff", color: "white" } : { color: "var(--tv-muted)" }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--tv-bg3)"; e.currentTarget.style.color = "var(--tv-text-light)"; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--tv-muted)"; } }}
            >
              <Icon className="h-4 w-4" />
              <div className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded px-2 py-1 text-xs group-hover:block shadow-xl border"
                style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}>
                {label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Logout"
        className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all"
        style={{ color: "var(--tv-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tv-bg3)"; e.currentTarget.style.color = "#ef5350"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--tv-muted)"; }}
      >
        <LogOut className="h-4 w-4" />
        <div className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded px-2 py-1 text-xs group-hover:block shadow-xl border"
          style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text-light)" }}>
          Logout
        </div>
      </button>
    </div>
  );
}
