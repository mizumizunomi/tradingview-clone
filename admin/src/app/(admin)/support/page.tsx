'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, RefreshCw, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Ticket {
  id: string
  subject: string
  message: string
  status: string
  priority: string
  adminNote: string | null
  createdAt: string
  user: { id: string; email: string; username: string }
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#ef5350',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#26a69a',
  CLOSED: '#64748b',
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#ef5350',
  HIGH: '#f97316',
  NORMAL: '#60a5fa',
  LOW: '#94a3b8',
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [saving, setSaving] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/support')
      const data = await res.json()
      setTickets(data.tickets ?? [])
      const n: Record<string, string> = {}
      for (const t of data.tickets ?? []) n[t.id] = t.adminNote ?? ''
      setNotes(n)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateTicket = async (id: string, updates: { status?: string; adminNote?: string }) => {
    setSaving(id)
    try {
      await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t))
    } catch { /* ignore */ }
    finally { setSaving(null) }
  }

  const filtered = statusFilter === 'ALL' ? tickets : tickets.filter((t) => t.status === statusFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tickets.length} total tickets</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 border border-[#2a2d3a] hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              statusFilter === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 border border-[#2a2d3a] hover:text-white'
            )}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            {s !== 'ALL' && (
              <span className="ml-1 text-[10px] opacity-70">
                ({tickets.filter((t) => t.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-[#2a2d3a] bg-[#1a1d29] overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1e2133] transition-colors"
                onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{ background: STATUS_COLORS[ticket.status] + '20', color: STATUS_COLORS[ticket.status] }}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: PRIORITY_COLORS[ticket.priority] + '20', color: PRIORITY_COLORS[ticket.priority] }}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-500">{ticket.user.username} · {ticket.user.email} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-gray-500 shrink-0 transition-transform', expanded === ticket.id && 'rotate-180')} />
              </div>

              {/* Expanded detail */}
              {expanded === ticket.id && (
                <div className="px-4 pb-4 border-t border-[#2a2d3a] pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Message</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{ticket.message}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Status</label>
                      <select
                        value={ticket.status}
                        onChange={(e) => updateTicket(ticket.id, { status: e.target.value })}
                        className="w-full rounded-lg border border-[#3a3d4a] bg-[#252836] px-3 py-2 text-sm text-white outline-none"
                      >
                        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Priority</label>
                      <select
                        value={ticket.priority}
                        onChange={(e) => updateTicket(ticket.id, { status: ticket.status, ...{ priority: e.target.value } as any })}
                        className="w-full rounded-lg border border-[#3a3d4a] bg-[#252836] px-3 py-2 text-sm text-white outline-none"
                      >
                        {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Admin Note</label>
                    <textarea
                      value={notes[ticket.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [ticket.id]: e.target.value }))}
                      placeholder="Internal note for this ticket..."
                      rows={2}
                      className="w-full rounded-lg border border-[#3a3d4a] bg-[#252836] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none"
                    />
                    <button
                      onClick={() => updateTicket(ticket.id, { adminNote: notes[ticket.id] ?? '' })}
                      disabled={saving === ticket.id}
                      className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      {saving === ticket.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Save Note'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
