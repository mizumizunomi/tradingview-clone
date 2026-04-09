"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { api, endpoints } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT_CONFIRMED: "#26a69a",
  DEPOSIT_REJECTED: "#ef5350",
  WITHDRAWAL_COMPLETED: "#26a69a",
  POSITION_CLOSED: "#f59e0b",
  KYC_APPROVED: "#26a69a",
  KYC_REJECTED: "#ef5350",
  SUPPORT_REPLY: "#2962ff",
  SYSTEM: "#5d6673",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const loadNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get(endpoints.notifications),
        api.get(endpoints.notificationsUnread),
      ]);
      setNotifications(Array.isArray(listRes.data) ? listRes.data : []);
      setUnreadCount(countRes.data.count ?? 0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await api.patch(endpoints.notificationRead(id));
      setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.patch(endpoints.notificationsMarkAllRead);
      setNotifications((n) => n.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{ background: open ? "var(--tv-bg3)" : "transparent" }}
        title="Notifications"
      >
        <Bell className="h-4 w-4" style={{ color: "var(--tv-muted)" }} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ef5350] text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1 z-[500] w-80 rounded-xl border shadow-2xl overflow-hidden"
          style={{ background: "var(--tv-bg2)", borderColor: "var(--tv-border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b"
            style={{ borderColor: "var(--tv-border)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--tv-text)" }}>
              Notifications {unreadCount > 0 && <span className="text-[#ef5350]">({unreadCount})</span>}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all read"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors"
                  style={{ color: "var(--tv-muted)" }}
                >
                  <CheckCheck className="h-3 w-3" /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="rounded p-0.5 transition-colors hover:bg-[var(--tv-bg3)]"
                style={{ color: "var(--tv-muted)" }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2"
                style={{ color: "var(--tv-muted)" }}>
                <Bell className="h-6 w-6 opacity-20" />
                <span className="text-xs">No notifications</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn("flex items-start gap-2.5 px-3 py-2.5 border-b cursor-pointer transition-colors",
                    !n.read && "hover:bg-[var(--tv-bg3)]")}
                  style={{
                    borderColor: "var(--tv-border)",
                    background: n.read ? undefined : "var(--tv-blue)08",
                  }}
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: n.read ? "transparent" : TYPE_COLORS[n.type] ?? "#2962ff" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate"
                      style={{ color: n.read ? "var(--tv-muted)" : "var(--tv-text)" }}>
                      {n.title}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed"
                      style={{ color: "var(--tv-muted)" }}>
                      {n.message}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--tv-muted)", opacity: 0.7 }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <button onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--tv-bg3)]"
                      style={{ color: "var(--tv-muted)" }} title="Mark as read">
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
