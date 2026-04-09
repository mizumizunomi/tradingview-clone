'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, RefreshCw, DollarSign, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Deposit {
  id: string
  amount: string
  method: string
  status: string
  createdAt: string
  wallet: {
    user: {
      id: string
      email: string
      username: string
      plan: string
    }
  }
}

const METHOD_LABEL: Record<string, string> = {
  WIRE_TRANSFER: 'Bank Transfer',
  DEBIT_CARD: 'Card',
  CRYPTO: 'Crypto',
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetch_ = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deposits')
      const data = await res.json()
      setDeposits(data.deposits ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch_() }, [])

  const confirm = async (id: string) => {
    setActionId(id)
    try {
      await fetch(`/api/deposits/${id}/confirm`, { method: 'POST' })
      setDeposits((d) => d.filter((x) => x.id !== id))
    } catch { /* ignore */ }
    finally { setActionId(null) }
  }

  const reject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    const id = rejectModal.id
    setActionId(id)
    try {
      await fetch(`/api/deposits/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      setDeposits((d) => d.filter((x) => x.id !== id))
    } catch { /* ignore */ }
    finally {
      setActionId(null)
      setRejectModal(null)
      setRejectReason('')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pending Deposits</h1>
          <p className="text-sm text-gray-400 mt-0.5">Confirm or reject user deposit requests</p>
        </div>
        <button
          onClick={fetch_}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 border border-[#2a2d3a] hover:text-white hover:border-[#3a3d4a] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      ) : deposits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <CheckCircle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No pending deposits</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#2a2d3a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1a1d29] border-b border-[#2a2d3a]">
              <tr>
                {['User', 'Amount', 'Method', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3a]">
              {deposits.map((d) => (
                <tr key={d.id} className="bg-[#1a1d29] hover:bg-[#1e2133] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{d.wallet?.user?.username ?? '—'}</div>
                    <div className="text-xs text-gray-500">{d.wallet?.user?.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-green-400" />
                      <span className="font-mono font-semibold text-green-400">
                        {Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{METHOD_LABEL[d.method] ?? d.method}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(d.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => confirm(d.id)}
                        disabled={actionId === d.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium border border-green-500/30 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                      >
                        {actionId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => { setRejectModal({ id: d.id }); setRejectReason('') }}
                        disabled={actionId === d.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium border border-red-500/30 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#2a2d3a] bg-[#1a1d29] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Reject Deposit</h2>
            <p className="text-sm text-gray-400 mb-4">Provide a reason for rejecting this deposit request.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full rounded-lg border border-[#3a3d4a] bg-[#252836] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none resize-none"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-[#3a3d4a] hover:text-white"
              >Cancel</button>
              <button
                onClick={reject}
                disabled={!rejectReason.trim() || actionId !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50"
              >
                {actionId ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
