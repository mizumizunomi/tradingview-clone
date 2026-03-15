"use client";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, Newspaper, Wallet, Info, Gem, Calendar, Filter, UserCircle, Sun, Moon, Keyboard, Monitor, HelpCircle, Sparkles, PanelLeft, LogOut, ChevronRight } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { useState, useEffect, useRef } from "react";

const NAV_ITEMS = [
  { icon: BarChart2, label: "Trade", href: "/trade" },
  { icon: Newspaper, label: "News", href: "/news" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Filter, label: "Screener", href: "/screener" },
  { icon: Gem, label: "Plans", href: "/plans" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: UserCircle, label: "Profile", href: "/profile" },
  { icon: Info, label: "About", href: "/about" },
];

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setToken, setUser, user, theme, toggleTheme, setShowKeyboardShortcuts, showObjectTree, setShowObjectTree } = useTradingStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileBtnRef = useRef<HTMLButtonElement>(null);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    router.push("/auth/login");
  };

  // Close on outside click
  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileBtnRef.current && profileBtnRef.current.contains(target)) return;
      // check if click is inside dropdown panel
      const panel = document.getElementById("profile-dropdown-panel");
      if (panel && panel.contains(target)) return;
      setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfileMenu]);

  const avatarLetter = user?.username ? user.username[0].toUpperCase() : "U";

  return (
    <div className="flex flex-col items-center border-r py-2" style={{ width: 48, background: "var(--tv-bg)", borderColor: "var(--tv-border)", position: "relative", zIndex: 30 }}>
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
              className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150"
              style={isActive ? { background: "var(--tv-blue)", color: "white" } : { color: "var(--tv-muted)" }}
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

      {/* Profile button */}
      <button
        ref={profileBtnRef}
        onClick={() => setShowProfileMenu((v) => !v)}
        title="Profile"
        className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all mb-1"
        style={{ color: showProfileMenu ? "white" : "var(--tv-muted)", background: showProfileMenu ? "#2962ff" : "transparent" }}
        onMouseEnter={(e) => { if (!showProfileMenu) { e.currentTarget.style.background = "var(--tv-bg3)"; e.currentTarget.style.color = "var(--tv-text-light)"; } }}
        onMouseLeave={(e) => { if (!showProfileMenu) { e.currentTarget.style.background = ""; e.currentTarget.style.color = "var(--tv-muted)"; } }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "#2962ff" }}
        >
          {avatarLetter}
        </div>
      </button>

      {/* Profile dropdown panel */}
      {showProfileMenu && (
        <div
          id="profile-dropdown-panel"
          style={{
            position: "fixed",
            bottom: 8,
            left: 56,
            zIndex: 50,
            width: 220,
            background: "var(--tv-bg2)",
            border: "1px solid var(--tv-border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          }}
        >
          {/* User info header */}
          <div className="flex items-center gap-2.5 px-3 py-3 border-b" style={{ borderColor: "var(--tv-border)" }}>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "#2962ff" }}
            >
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: "var(--tv-text)" }}>
                {user?.username || "Guest"}
              </div>
              <div className="text-[10px] truncate" style={{ color: "var(--tv-muted)" }}>
                {user?.email || ""}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* Profile Settings */}
            <button
              onClick={() => { router.push("/profile"); setShowProfileMenu(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "var(--tv-text-light)" }}
            >
              <UserCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
              Profile Settings
            </button>

            {/* Help Center */}
            <button
              onClick={() => setShowProfileMenu(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "var(--tv-text-light)" }}
            >
              <HelpCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
              Help Center
            </button>

            {/* What's new */}
            <button
              onClick={() => setShowProfileMenu(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "var(--tv-text-light)" }}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
              <span className="flex-1 text-left">What&apos;s new</span>
              <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-[#2962ff] text-white">NEW</span>
            </button>

            {/* Keyboard shortcuts */}
            <button
              onClick={() => { setShowKeyboardShortcuts(true); setShowProfileMenu(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "var(--tv-text-light)" }}
            >
              <Keyboard className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
              <span className="flex-1 text-left">Keyboard shortcuts</span>
              <span className="text-[9px]" style={{ color: "var(--tv-muted)" }}>Ctrl+/</span>
            </button>

            {/* Drawings toolbar */}
            <button
              onClick={() => { setShowObjectTree(!showObjectTree); setShowProfileMenu(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "var(--tv-text-light)" }}
            >
              <PanelLeft className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
              <span className="flex-1 text-left">Drawings toolbar</span>
              <span className="text-[9px]" style={{ color: showObjectTree ? "#26a69a" : "var(--tv-muted)" }}>
                {showObjectTree ? "On" : "Off"}
              </span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => { toggleTheme(); setShowProfileMenu(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "var(--tv-text-light)" }}
            >
              {theme === "dark"
                ? <Sun className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
                : <Moon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
              }
              <span className="flex-1 text-left">{theme === "dark" ? "Light" : "Dark"} theme</span>
              <ChevronRight className="h-3 w-3" style={{ color: "var(--tv-muted)" }} />
            </button>

            {/* Get desktop app */}
            <button
              onClick={() => setShowProfileMenu(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "var(--tv-text-light)" }}
            >
              <Monitor className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-muted)" }} />
              Get desktop app
            </button>
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: "var(--tv-border)" }} />

          {/* Sign out */}
          <div className="py-1">
            <button
              onClick={() => { setShowProfileMenu(false); handleLogout(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--tv-bg3)]"
              style={{ color: "#ef5350" }}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
