import { getAdminSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserDetailClient } from './UserDetailClient'

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      wallet: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 } } },
      positions: {
        include: { asset: { select: { symbol: true, name: true } } },
        orderBy: { openedAt: 'desc' },
      },
      orders: {
        include: { asset: { select: { symbol: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
      trades: {
        include: { asset: { select: { symbol: true } } },
        orderBy: { executedAt: 'desc' },
        take: 30,
      },
    },
  })

  if (!user) notFound()

  const { password: _, ...safeUser } = user

  // Serialize Prisma Decimal fields to plain numbers for client component
  const serializedUser = {
    ...safeUser,
    wallet: safeUser.wallet ? {
      ...safeUser.wallet,
      balance: Number(safeUser.wallet.balance),
      equity: Number(safeUser.wallet.equity),
      margin: Number(safeUser.wallet.margin),
      freeMargin: Number(safeUser.wallet.freeMargin),
      marginLevel: Number(safeUser.wallet.marginLevel),
      transactions: safeUser.wallet.transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
      })),
    } : null,
    positions: safeUser.positions.map(p => ({
      ...p,
      entryPrice: Number(p.entryPrice),
      currentPrice: Number(p.currentPrice),
      stopLoss: p.stopLoss != null ? Number(p.stopLoss) : null,
      takeProfit: p.takeProfit != null ? Number(p.takeProfit) : null,
      unrealizedPnL: Number(p.unrealizedPnL),
      realizedPnL: Number(p.realizedPnL),
      margin: Number(p.margin),
      commission: Number(p.commission),
      spread: Number(p.spread),
      swap: Number(p.swap),
    })),
    orders: safeUser.orders.map(o => ({
      ...o,
      entryPrice: o.entryPrice != null ? Number(o.entryPrice) : null,
      stopLoss: o.stopLoss != null ? Number(o.stopLoss) : null,
      takeProfit: o.takeProfit != null ? Number(o.takeProfit) : null,
      limitPrice: o.limitPrice != null ? Number(o.limitPrice) : null,
      filledPrice: o.filledPrice != null ? Number(o.filledPrice) : null,
      margin: o.margin != null ? Number(o.margin) : null,
      commission: o.commission != null ? Number(o.commission) : null,
      spread: o.spread != null ? Number(o.spread) : null,
    })),
    trades: safeUser.trades.map(t => ({
      ...t,
      price: Number(t.price),
      pnl: Number(t.pnl),
      commission: Number(t.commission),
    })),
  }

  return <UserDetailClient user={serializedUser as any} adminRole={session.role} />
}
