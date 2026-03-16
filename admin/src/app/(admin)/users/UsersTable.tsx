'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

interface User {
  id: string
  email: string
  username: string
  firstName: string | null
  lastName: string | null
  plan: string
  isBanned: boolean
  createdAt: string
  wallet: { balance: number; equity: number } | null
}

export function UsersTable() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState('all')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      search,
      plan: plan === 'all' ? '' : plan,
      status: status === 'all' ? '' : status,
      sortBy,
      sortDir,
    })
    const res = await fetch(`/api/users?${params}`)
    const data = await res.json()
    setUsers(data.users)
    setTotal(data.total)
    setPages(data.pages)
    setLoading(false)
  }, [page, search, plan, status, sortBy, sortDir])

  useEffect(() => { load() }, [load])

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortBtn = ({ col, label }: { col: string; label: string }) => (
    <button onClick={() => toggleSort(col)} className="hover:text-white transition-colors flex items-center gap-1">
      {label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search email, username, ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 bg-[#1a1d29] border-[#2a2d3a]"
          />
        </div>
        <Select value={plan} onValueChange={(v) => { setPlan(v); setPage(1) }}>
          <SelectTrigger className="w-32 bg-[#1a1d29] border-[#2a2d3a]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-32 bg-[#1a1d29] border-[#2a2d3a]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-400">{total} users</span>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d29] border border-[#2a2d3a] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
                <th className="text-left px-4 py-3"><SortBtn col="username" label="User" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="email" label="Email" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="plan" label="Plan" /></th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3"><SortBtn col="createdAt" label="Joined" /></th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#2a2d3a]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-[#2a2d3a] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : users.map((u) => (
                    <tr key={u.id} className="border-b border-[#2a2d3a] hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-white">{u.username}</div>
                          <div className="text-xs text-gray-500 font-mono">{u.id.slice(0, 8)}…</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.plan === 'platinum' ? 'warning' : u.plan === 'gold' ? 'info' : 'secondary'} className="capitalize">
                          {u.plan}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {u.wallet ? formatCurrency(u.wallet.balance) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {u.isBanned
                          ? <Badge variant="destructive">Banned</Badge>
                          : <Badge variant="success">Active</Badge>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/users/${u.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]">
          <span className="text-xs text-gray-400">
            Page {page} of {pages}
          </span>
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
    </div>
  )
}
