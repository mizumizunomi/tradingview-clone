'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { formatCurrency, formatDate, getPnLColor, getPnLSign } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Ban, DollarSign, KeyRound, X } from 'lucide-react'

interface Props {
  user: {
    id: string; email: string; username: string; firstName: string | null; lastName: string | null
    plan: string; isBanned: boolean; banReason: string | null; createdAt: Date; updatedAt: Date
    wallet: {
      id: string; balance: number; equity: number; margin: number; freeMargin: number; marginLevel: number
      transactions: { id: string; type: string; amount: number; description: string | null; createdAt: Date }[]
    } | null
    positions: {
      id: string; side: string; quantity: number; leverage: number; entryPrice: number; currentPrice: number
      unrealizedPnL: number; realizedPnL: number; margin: number; isOpen: boolean; openedAt: Date; closedAt: Date | null
      asset: { symbol: string; name: string }
    }[]
    orders: { id: string; type: string; side: string; quantity: number; status: string; createdAt: Date; asset: { symbol: string } }[]
    trades: { id: string; type: string; side: string; quantity: number; price: number; pnl: number; executedAt: Date; asset: { symbol: string } }[]
  }
  adminRole: string
}

export function UserDetailClient({ user: initialUser, adminRole }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState(initialUser)
  const [saving, setSaving] = useState(false)

  // Balance adjustment
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Ban dialog
  const [banOpen, setBanOpen] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  // Force close position
  const [closingId, setClosingId] = useState<string | null>(null)

  async function handleBalanceAdjust() {
    const amt = parseFloat(balanceAmount)
    if (isNaN(amt) || amt === 0) return
    setAdjusting(true)
    try {
      const res = await fetch(`/api/users/${user.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, reason: balanceReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUser(u => ({ ...u, wallet: u.wallet ? { ...u.wallet, balance: data.balance } : u.wallet }))
      toast({ title: 'Balance updated', description: `New balance: ${formatCurrency(data.balance)}`, variant: 'success' as Parameters<typeof toast>[0]['variant'] })
      setBalanceOpen(false)
      setBalanceAmount('')
      setBalanceReason('')
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setAdjusting(false)
    }
  }

  async function handleBanToggle() {
    setBanning(true)
    try {
      const res = await fetch(`/api/users/${user.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ban: !user.isBanned, reason: banReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUser(u => ({ ...u, isBanned: data.isBanned, banReason: banReason || null }))
      toast({ title: data.isBanned ? 'User banned' : 'User unbanned', variant: 'success' as Parameters<typeof toast>[0]['variant'] })
      setBanOpen(false)
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setBanning(false)
    }
  }

  async function handleResetPassword() {
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTempPassword(data.tempPassword)
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setResetting(false)
    }
  }

  async function handleForceClose(positionId: string) {
    if (!confirm('Force close this position?')) return
    setClosingId(positionId)
    try {
      const res = await fetch(`/api/users/${user.id}/positions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUser(u => ({
        ...u,
        positions: u.positions.map(p => p.id === positionId ? { ...p, isOpen: false, realizedPnL: data.pnl } : p),
      }))
      toast({ title: 'Position closed', description: `P&L: ${formatCurrency(data.pnl)}`, variant: 'success' as Parameters<typeof toast>[0]['variant'] })
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setClosingId(null)
    }
  }

  const openPositions = user.positions.filter(p => p.isOpen)
  const closedPositions = user.positions.filter(p => !p.isOpen)

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{user.username}</h2>
            {user.isBanned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="success">Active</Badge>}
            <Badge variant="info" className="capitalize">{user.plan}</Badge>
          </div>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBalanceOpen(true)} className="gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Adjust Balance
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setResetOpen(true); setTempPassword('') }} className="gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Reset Password
          </Button>
          <Button
            variant={user.isBanned ? 'outline' : 'destructive'}
            size="sm"
            onClick={() => setBanOpen(true)}
            className="gap-1.5"
          >
            <Ban className="w-3.5 h-3.5" /> {user.isBanned ? 'Unban' : 'Ban'}
          </Button>
        </div>
      </div>

      {/* Wallet summary */}
      {user.wallet && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Balance', value: formatCurrency(user.wallet.balance) },
            { label: 'Equity', value: formatCurrency(user.wallet.equity) },
            { label: 'Margin Used', value: formatCurrency(user.wallet.margin) },
            { label: 'Free Margin', value: formatCurrency(user.wallet.freeMargin) },
          ].map(s => (
            <Card key={s.label} className="bg-[#1a1d29] border-[#2a2d3a]">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-white mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="positions">
        <TabsList className="bg-[#1a1d29] border border-[#2a2d3a]">
          <TabsTrigger value="positions">Open Positions ({openPositions.length})</TabsTrigger>
          <TabsTrigger value="history">Trade History ({user.trades.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed Positions ({closedPositions.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({user.wallet?.transactions.length ?? 0})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({user.orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <DataTable
            cols={['Symbol', 'Side', 'Qty', 'Leverage', 'Entry', 'Current', 'P&L', 'Margin', 'Opened', '']}
            rows={openPositions}
            renderRow={(p) => [
              <span className="font-medium">{p.asset.symbol}</span>,
              <Badge variant={p.side === 'BUY' ? 'success' : 'destructive'}>{p.side}</Badge>,
              p.quantity,
              `${p.leverage}x`,
              formatCurrency(p.entryPrice),
              formatCurrency(p.currentPrice),
              <span className={getPnLColor(p.unrealizedPnL)}>{getPnLSign(p.unrealizedPnL)}{formatCurrency(p.unrealizedPnL)}</span>,
              formatCurrency(p.margin),
              formatDate(p.openedAt),
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleForceClose(p.id)} disabled={closingId === p.id}>
                {closingId === p.id ? '…' : <><X className="w-3 h-3" /> Close</>}
              </Button>,
            ]}
          />
        </TabsContent>

        <TabsContent value="history">
          <DataTable
            cols={['Symbol', 'Type', 'Side', 'Qty', 'Price', 'P&L', 'Commission', 'Date']}
            rows={user.trades}
            renderRow={(t) => [
              t.asset.symbol,
              t.type,
              <Badge variant={t.side === 'BUY' ? 'success' : 'destructive'}>{t.side}</Badge>,
              t.quantity,
              formatCurrency(t.price),
              <span className={getPnLColor(t.pnl)}>{getPnLSign(t.pnl)}{formatCurrency(t.pnl)}</span>,
              formatCurrency((t as { commission?: number }).commission ?? 0),
              formatDate(t.executedAt),
            ]}
          />
        </TabsContent>

        <TabsContent value="closed">
          <DataTable
            cols={['Symbol', 'Side', 'Qty', 'Entry', 'Realized P&L', 'Closed']}
            rows={closedPositions}
            renderRow={(p) => [
              p.asset.symbol,
              <Badge variant={p.side === 'BUY' ? 'success' : 'destructive'}>{p.side}</Badge>,
              p.quantity,
              formatCurrency(p.entryPrice),
              <span className={getPnLColor(p.realizedPnL)}>{getPnLSign(p.realizedPnL)}{formatCurrency(p.realizedPnL)}</span>,
              p.closedAt ? formatDate(p.closedAt) : '—',
            ]}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <DataTable
            cols={['Type', 'Amount', 'Description', 'Date']}
            rows={user.wallet?.transactions ?? []}
            renderRow={(t) => [
              <Badge variant={t.type === 'DEPOSIT' || t.type === 'ADMIN_ADJUSTMENT' && t.amount > 0 ? 'success' : 'destructive'}>{t.type.replace('_', ' ')}</Badge>,
              <span className={getPnLColor(t.amount)}>{getPnLSign(t.amount)}{formatCurrency(t.amount)}</span>,
              t.description ?? '—',
              formatDate(t.createdAt),
            ]}
          />
        </TabsContent>

        <TabsContent value="orders">
          <DataTable
            cols={['Symbol', 'Type', 'Side', 'Qty', 'Status', 'Created']}
            rows={user.orders}
            renderRow={(o) => [
              o.asset.symbol,
              o.type,
              <Badge variant={o.side === 'BUY' ? 'success' : 'destructive'}>{o.side}</Badge>,
              o.quantity,
              <Badge variant={o.status === 'FILLED' ? 'success' : o.status === 'CANCELLED' ? 'secondary' : 'warning'}>{o.status}</Badge>,
              formatDate(o.createdAt),
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Balance Adjust Dialog */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent className="bg-[#1a1d29] border-[#2a2d3a]">
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>Use positive amounts to add, negative to deduct.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="e.g. 500 or -100" className="bg-[#252836] border-[#3a3d4a]" />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={balanceReason} onChange={e => setBalanceReason(e.target.value)} placeholder="Reason for adjustment..." className="bg-[#252836] border-[#3a3d4a]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBalanceOpen(false)}>Cancel</Button>
            <Button onClick={handleBalanceAdjust} disabled={adjusting || !balanceAmount || !balanceReason}>
              {adjusting ? 'Saving…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="bg-[#1a1d29] border-[#2a2d3a]">
          <DialogHeader>
            <DialogTitle>{user.isBanned ? 'Unban User' : 'Ban User'}</DialogTitle>
            <DialogDescription>{user.isBanned ? 'Restore access to this account.' : 'This will block the user from logging in.'}</DialogDescription>
          </DialogHeader>
          {!user.isBanned && (
            <div className="space-y-2 py-2">
              <Label>Ban Reason</Label>
              <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban..." className="bg-[#252836] border-[#3a3d4a]" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanOpen(false)}>Cancel</Button>
            <Button variant={user.isBanned ? 'default' : 'destructive'} onClick={handleBanToggle} disabled={banning}>
              {banning ? '…' : user.isBanned ? 'Unban' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="bg-[#1a1d29] border-[#2a2d3a]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Generate a temporary password for this user.</DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="py-4">
              <p className="text-sm text-gray-400 mb-2">Temporary password (copy now, shown once):</p>
              <code className="block bg-[#252836] border border-[#3a3d4a] rounded px-3 py-2 text-green-400 font-mono text-sm select-all">{tempPassword}</code>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4">This will generate a new temporary password. The user&apos;s current password will be invalidated.</p>
          )}
          <DialogFooter>
            {tempPassword ? (
              <Button onClick={() => setResetOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetting}>
                  {resetting ? '…' : 'Generate Password'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DataTable<T>({
  cols, rows, renderRow,
}: {
  cols: string[]
  rows: T[]
  renderRow: (row: T) => React.ReactNode[]
}) {
  if (rows.length === 0) {
    return <div className="bg-[#1a1d29] border border-[#2a2d3a] rounded-lg p-8 text-center text-gray-500 text-sm">No records</div>
  }
  return (
    <div className="bg-[#1a1d29] border border-[#2a2d3a] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
              {cols.map(c => <th key={c} className="text-left px-4 py-3 font-medium">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[#2a2d3a] last:border-0 hover:bg-white/3">
                {renderRow(row).map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-gray-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
