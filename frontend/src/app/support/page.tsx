"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SideNav } from "@/components/layout/SideNav";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { MessageCircle, Plus, ChevronDown, Loader2, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#ef5350",
  IN_PROGRESS: "#f59e0b",
  RESOLVED: "#26a69a",
  CLOSED: "#5d6673",
};

export default function SupportPage() {
  const router = useRouter();
  const { token } = useTradingStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", priority: "NORMAL" });

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    loadTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.supportTickets);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch { setTickets([]); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      await api.post(endpoints.supportTickets, form);
      setForm({ subject: "", message: "", priority: "NORMAL" });
      setShowForm(false);
      await loadTickets();
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      <SideNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-[#2962ff]" />
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--tv-text-light)" }}>Support</h1>
              <p className="text-xs" style={{ color: "var(--tv-muted)" }}>Submit and track your support requests</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: "#2962ff", color: "white" }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Ticket
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* New ticket form */}
          {showForm && (
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
              <h2 className="text-sm font-bold mb-4" style={{ color: "var(--tv-text)" }}>New Support Ticket</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                    style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                      style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }}
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue in detail..."
                    required
                    rows={4}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border resize-none"
                    style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg text-xs transition-colors"
                    style={{ color: "var(--tv-muted)", border: "1px solid var(--tv-border)" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                    style={{ background: "#2962ff", color: "white" }}>
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {submitting ? "Submitting…" : "Submit Ticket"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tickets list */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--tv-muted)" }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "var(--tv-muted)" }}>
              <MessageCircle className="h-10 w-10 opacity-20" />
              <p className="text-sm">No tickets yet. Click &quot;New Ticket&quot; to get help.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border overflow-hidden"
                  style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    style={{ background: expanded === ticket.id ? "var(--tv-bg3)" : undefined }}
                    onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ background: STATUS_COLORS[ticket.status] + "20", color: STATUS_COLORS[ticket.status] }}>
                          {ticket.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate" style={{ color: "var(--tv-text)" }}>{ticket.subject}</p>
                      <p className="flex items-center gap-1 text-xs" style={{ color: "var(--tv-muted)" }}>
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform shrink-0", expanded === ticket.id && "rotate-180")}
                      style={{ color: "var(--tv-muted)" }} />
                  </div>
                  {expanded === ticket.id && (
                    <div className="px-4 pb-4 pt-3 border-t space-y-3" style={{ borderColor: "var(--tv-border)" }}>
                      <div>
                        <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--tv-muted)" }}>Your message</p>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--tv-text)" }}>{ticket.message}</p>
                      </div>
                      {ticket.adminNote && (
                        <div className="rounded-lg p-3" style={{ background: "#2962ff10", border: "1px solid #2962ff30" }}>
                          <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#4d7cff" }}>Support Response</p>
                          <p className="text-sm" style={{ color: "var(--tv-text)" }}>{ticket.adminNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
