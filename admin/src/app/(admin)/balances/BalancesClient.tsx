'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Search, ChevronLeft, ChevronRight, DollarSign, ExternalLink } from 'lucide-react'

interface WalletUser {
  id: string; email: string; username: string; plan: string
  wallet: { balance: number; equity: number; margin: number; freeMargin: number } | null
}

export function BalancesClient() {
  const { toast } = useToast()
  const [users, setUsers] = useState<WalletUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Single adjust
  const [adjustUser, setAdjustUser] = useState<WalletUser | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Bulk adjust
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [bulking, setBulking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), search })
    const res = await fetch(`/api/balances?${params}`)
    const data = await res.json()
    setUsers(data.users); setTotal(data.total); setPages(data.pages)
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function handleAdjust() {
    if (!adjustUser) return
    const amt = parseFloat(adjustAmount)
    if (isNaN(amt) || amt === 0 || !adjustReason.trim()) return
    setAdjusting(true)
    try {
      const res = await fetch(`/api/users/${adjustUser.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, reason: adjustReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(u => u.map(user => user.id === adjustUser.id && user.wallet
        ? { ...user, wallet: { ...user.wallet, balance: data.balance } } : user))
      toast({ title: 'Done', description: `Balance updated to ${formatCurrency(data.balance)}` })
      setAdjustUser(null); setAdjustAmount(''); setAdjustReason('')
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setAdjusting(false) }
  }

  async function handleBulk() {
    const amt = parseFloat(bulkAmount)
    if (isNaN(amt) || amt === 0 || !bulkReason.trim() || selected.size === 0) return
    setBulking(true)
    try {
      const res = await fetch('/api/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selected), amount: amt, reason: bulkReason }),
      })
      const data = await res.json()
      const succeeded = data.results.filter((r: { success: boolean }) => r.success).length
      toast({ title: 'Bulk adjust complete', description: `${succeeded}/${selected.size} users updated` })
      setSelected(new Set()); setBulkOpen(false); setBulkAmount(''); setBulkReason('')
      load()
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setBulking(false) }
  }

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function selectAll() {
    if (selected.size === users.length) setSelected(new Set())
    else setSelected(new Set(users.map(u => u.id)))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 bg-[#1a1d29] border-[#2a2d3a]" />
        </div>
        {selected.size > 0 && (
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Bulk Adjust ({selected.size})
          </Button>
        )}
        <span className="text-sm text-gray-400">{total} users</span>
      </div>

      <div className="bg-[#1a1d29] border border-[#2a2d3a] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selected.size === users.length && users.length > 0}
                    onChange={selectAll} className="rounded" />
                </th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-right px-4 py-3">Equity</th>
                <th className="text-right px-4 py-3">Margin</th>
                <th className="text-right px-4 py-3">Free Margin</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#2a2d3a]">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-[#2a2d3a] rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                : users.map(u => (
                    <tr key={u.id} className="border-b border-[#2a2d3a] hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-white">{u.username}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="capitalize">{u.plan}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">{u.wallet ? formatCurrency(u.wallet.balance) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{u.wallet ? formatCurrency(u.wallet.equity) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-orange-400">{u.wallet ? formatCurrency(u.wallet.margin) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-400">{u.wallet ? formatCurrency(u.wallet.freeMargin) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setAdjustUser(u); setAdjustAmount(''); setAdjustReason('') }}>
                            <DollarSign className="w-3 h-3" /> Adjust
                          </Button>
                          <Link href={`/users/${u.id}`}>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="w-3 h-3" /></Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]">
          <span className="text-xs text-gray-400">Page {page} of {pages}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Single Adjust Dialog */}
      <Dialog open={!!adjustUser} onOpenChange={open => !open && setAdjustUser(null)}>
        <DialogContent className="bg-[#1a1d29] border-[#2a2d3a]">
          <DialogHeader>
            <DialogTitle>Adjust Balance — {adjustUser?.username}</DialogTitle>
            <DialogDescription>Current: {adjustUser?.wallet ? formatCurrency(adjustUser.wallet.balance) : '—'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (positive to add, negative to deduct)</Label>
              <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="e.g. 500 or -100" className="bg-[#252836] border-[#3a3d4a]" />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason..." className="bg-[#252836] border-[#3a3d4a]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustUser(null)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjusting || !adjustAmount || !adjustReason}>
              {adjusting ? '…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Adjust Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-[#1a1d29] border-[#2a2d3a]">
          <DialogHeader>
            <DialogTitle>Bulk Adjust — {selected.size} users</DialogTitle>
            <DialogDescription>Apply the same balance change to all selected users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (positive to add, negative to deduct)</Label>
              <Input type="number" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} placeholder="e.g. 100 or -50" className="bg-[#252836] border-[#3a3d4a]" />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={bulkReason} onChange={e => setBulkReason(e.target.value)} placeholder="Reason..." className="bg-[#252836] border-[#3a3d4a]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulk} disabled={bulking || !bulkAmount || !bulkReason}>
              {bulking ? '…' : `Apply to ${selected.size} users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
