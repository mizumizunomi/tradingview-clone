'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, getPnLColor, getPnLSign } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react'

function TablePagination({ total, page, pages, onPage }: { total: number; page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]">
      <span className="text-xs text-gray-400">{total} total · Page {page} of {pages}</span>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPage(Math.min(pages, page + 1))} disabled={page >= pages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function TableWrapper({ children, total, page, pages, onPage }: { children: React.ReactNode; total: number; page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="bg-[#1a1d29] border border-[#2a2d3a] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
      <TablePagination total={total} page={page} pages={pages} onPage={onPage} />
    </div>
  )
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-[#2a2d3a]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3"><div className="h-4 bg-[#2a2d3a] rounded animate-pulse" /></td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

interface Position {
  id: string; side: string; quantity: number; leverage: number; entryPrice: number; currentPrice: number
  unrealizedPnL: number; realizedPnL: number; margin: number; isOpen: boolean; openedAt: string; closedAt: string | null
  user: { id: string; username: string }
  asset: { symbol: string; name: string }
}

interface Trade {
  id: string; type: string; side: string; quantity: number; price: number; pnl: number; commission: number; executedAt: string
  user: { id: string; username: string }
  asset: { symbol: string }
}

export function TradesClient() {
  const { toast } = useToast()
  const [tab, setTab] = useState('open')
  const [items, setItems] = useState<(Position | Trade)[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tab, page: String(page), search })
    const res = await fetch(`/api/trades?${params}`)
    const data = await res.json()
    setItems(data.items); setTotal(data.total); setPages(data.pages)
    setLoading(false)
  }, [tab, page, search])

  useEffect(() => { load() }, [load])

  async function forceClose(positionId: string) {
    if (!confirm('Force close this position at current price?')) return
    setClosingId(positionId)
    try {
      const res = await fetch('/api/trades/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Position closed', description: `P&L: ${formatCurrency(data.pnl)}` })
      load()
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setClosingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search user or symbol..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 bg-[#1a1d29] border-[#2a2d3a]" />
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1) }}>
        <TabsList className="bg-[#1a1d29] border border-[#2a2d3a]">
          <TabsTrigger value="open">Open Positions</TabsTrigger>
          <TabsTrigger value="closed">Closed Positions</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <TableWrapper total={total} page={page} pages={pages} onPage={setPage}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3">Side</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Leverage</th>
                  <th className="text-right px-4 py-3">Entry</th>
                  <th className="text-right px-4 py-3">Current</th>
                  <th className="text-right px-4 py-3">Unreal. P&L</th>
                  <th className="text-right px-4 py-3">Margin</th>
                  <th className="text-left px-4 py-3">Opened</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              {loading ? <TableSkeleton cols={11} /> : (
                <tbody>
                  {(items as Position[]).map(p => (
                    <tr key={p.id} className="border-b border-[#2a2d3a] hover:bg-white/3">
                      <td className="px-4 py-3">
                        <Link href={`/users/${p.user.id}`} className="text-blue-400 hover:underline text-xs">{p.user.username}</Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{p.asset.symbol}</td>
                      <td className="px-4 py-3"><Badge variant={p.side === 'BUY' ? 'success' : 'destructive'}>{p.side}</Badge></td>
                      <td className="px-4 py-3 text-right">{p.quantity}</td>
                      <td className="px-4 py-3 text-right">{p.leverage}x</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.entryPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.currentPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={getPnLColor(p.unrealizedPnL)}>{getPnLSign(p.unrealizedPnL)}{formatCurrency(p.unrealizedPnL)}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.margin)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.openedAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => forceClose(p.id)} disabled={closingId === p.id}>
                          {closingId === p.id ? '…' : <><X className="w-3 h-3" />Close</>}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={11} className="text-center py-8 text-gray-500">No open positions</td></tr>}
                </tbody>
              )}
            </table>
          </TableWrapper>
        </TabsContent>

        <TabsContent value="closed">
          <TableWrapper total={total} page={page} pages={pages} onPage={setPage}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3">Side</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Entry</th>
                  <th className="text-right px-4 py-3">Realized P&L</th>
                  <th className="text-left px-4 py-3">Opened</th>
                  <th className="text-left px-4 py-3">Closed</th>
                </tr>
              </thead>
              {loading ? <TableSkeleton cols={8} /> : (
                <tbody>
                  {(items as Position[]).map(p => (
                    <tr key={p.id} className="border-b border-[#2a2d3a] hover:bg-white/3">
                      <td className="px-4 py-3">
                        <Link href={`/users/${p.user.id}`} className="text-blue-400 hover:underline text-xs">{p.user.username}</Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{p.asset.symbol}</td>
                      <td className="px-4 py-3"><Badge variant={p.side === 'BUY' ? 'success' : 'destructive'}>{p.side}</Badge></td>
                      <td className="px-4 py-3 text-right">{p.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.entryPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={getPnLColor(p.realizedPnL)}>{getPnLSign(p.realizedPnL)}{formatCurrency(p.realizedPnL)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(p.openedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{p.closedAt ? formatDate(p.closedAt) : '—'}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-500">No closed positions</td></tr>}
                </tbody>
              )}
            </table>
          </TableWrapper>
        </TabsContent>

        <TabsContent value="trades">
          <TableWrapper total={total} page={page} pages={pages} onPage={setPage}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Side</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">P&L</th>
                  <th className="text-right px-4 py-3">Commission</th>
                  <th className="text-left px-4 py-3">Executed</th>
                </tr>
              </thead>
              {loading ? <TableSkeleton cols={9} /> : (
                <tbody>
                  {(items as Trade[]).map(t => (
                    <tr key={t.id} className="border-b border-[#2a2d3a] hover:bg-white/3">
                      <td className="px-4 py-3">
                        <Link href={`/users/${t.user.id}`} className="text-blue-400 hover:underline text-xs">{t.user.username}</Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{t.asset.symbol}</td>
                      <td className="px-4 py-3 text-gray-400">{t.type}</td>
                      <td className="px-4 py-3"><Badge variant={t.side === 'BUY' ? 'success' : 'destructive'}>{t.side}</Badge></td>
                      <td className="px-4 py-3 text-right">{t.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(t.price)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={getPnLColor(t.pnl)}>{getPnLSign(t.pnl)}{formatCurrency(t.pnl)}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-400">{formatCurrency(t.commission ?? 0)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(t.executedAt)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-gray-500">No trades</td></tr>}
                </tbody>
              )}
            </table>
          </TableWrapper>
        </TabsContent>
      </Tabs>
    </div>
  )
}
