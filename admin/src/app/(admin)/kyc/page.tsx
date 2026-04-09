'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, RefreshCw, Loader2, CheckCircle, XCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KycSubmission {
  id: string
  status: string
  fullName: string
  dateOfBirth: string
  country: string
  address: string
  documentType: string
  adminNote: string | null
  submittedAt: string
  user: { id: string; email: string; username: string }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#26a69a',
  REJECTED: '#ef5350',
  RESUBMIT: '#a78bfa',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING: AlertCircle,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  RESUBMIT: AlertCircle,
}

export default function KycPage() {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState('ALL')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kyc')
      const data = await res.json()
      setSubmissions(data.submissions ?? [])
      const n: Record<string, string> = {}
      for (const s of data.submissions ?? []) n[s.id] = s.adminNote ?? ''
      setNotes(n)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateKyc = async (id: string, status: string) => {
    setSaving(id)
    try {
      await fetch(`/api/kyc/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: notes[id] ?? '' }),
      })
      setSubmissions((s) => s.map((x) => x.id === id ? { ...x, status } : x))
      setExpanded(null)
    } catch { /* ignore */ }
    finally { setSaving(null) }
  }

  const filtered = statusFilter === 'ALL' ? submissions : submissions.filter((s) => s.status === statusFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">KYC Verifications</h1>
          <p className="text-sm text-gray-400 mt-0.5">Review and approve identity verification submissions</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 border border-[#2a2d3a] hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              statusFilter === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 border border-[#2a2d3a] hover:text-white')}>
            {s === 'ALL' ? 'All' : s}
            {s !== 'ALL' && <span className="ml-1 opacity-70">({submissions.filter((x) => x.status === s).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No KYC submissions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const Icon = STATUS_ICONS[sub.status] ?? AlertCircle
            return (
              <div key={sub.id} className="rounded-xl border border-[#2a2d3a] bg-[#1a1d29] overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1e2133] transition-colors"
                  onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: STATUS_COLORS[sub.status] }} />
                      <span className="text-xs font-bold" style={{ color: STATUS_COLORS[sub.status] }}>{sub.status}</span>
                    </div>
                    <p className="text-sm font-medium text-white">{sub.fullName}</p>
                    <p className="text-xs text-gray-500">{sub.user.username} · {sub.user.email} · {sub.country}</p>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-gray-500 shrink-0 transition-transform', expanded === sub.id && 'rotate-180')} />
                </div>

                {expanded === sub.id && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#2a2d3a] space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ['Full Name', sub.fullName],
                        ['Date of Birth', sub.dateOfBirth],
                        ['Country', sub.country],
                        ['Document Type', sub.documentType],
                        ['Submitted', new Date(sub.submittedAt).toLocaleString()],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-gray-500 uppercase mb-0.5">{label}</p>
                          <p className="text-white">{value}</p>
                        </div>
                      ))}
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 uppercase mb-0.5">Address</p>
                        <p className="text-white">{sub.address}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Admin Note</label>
                      <textarea
                        value={notes[sub.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [sub.id]: e.target.value }))}
                        placeholder="Reason for approval/rejection..."
                        rows={2}
                        className="w-full rounded-lg border border-[#3a3d4a] bg-[#252836] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none"
                      />
                    </div>

                    {sub.status === 'PENDING' && (
                      <div className="flex gap-3">
                        <button onClick={() => updateKyc(sub.id, 'APPROVED')} disabled={saving === sub.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 disabled:opacity-50">
                          {saving === sub.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Approve
                        </button>
                        <button onClick={() => updateKyc(sub.id, 'REJECTED')} disabled={saving === sub.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50">
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                        <button onClick={() => updateKyc(sub.id, 'RESUBMIT')} disabled={saving === sub.id}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 disabled:opacity-50">
                          <AlertCircle className="w-3 h-3" />
                          Request Resubmit
                        </button>
                      </div>
                    )}
                    {sub.status !== 'PENDING' && (
                      <button onClick={() => updateKyc(sub.id, 'PENDING')} disabled={saving === sub.id}
                        className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-[#3a3d4a] hover:text-white disabled:opacity-50">
                        Reset to Pending
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
