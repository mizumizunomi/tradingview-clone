import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const session = await getAdminSession()
  const denied = requireRole(session, 'SUPPORT')
  if (denied) return denied

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    todayUsers,
    weekUsers,
    monthUsers,
    totalWallets,
    openPositions,
    todayTrades,
    topAssets,
    registrationsByDay,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.wallet.aggregate({ _sum: { balance: true, equity: true, margin: true } }),
    prisma.position.count({ where: { isOpen: true } }),
    prisma.trade.count({ where: { executedAt: { gte: today } } }),
    prisma.trade.groupBy({
      by: ['assetId'],
      _count: { id: true },
      _sum: { commission: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.user.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: { createdAt: { gte: monthAgo } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Get asset names for top assets
  const assetIds = topAssets.map((a) => a.assetId)
  const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, symbol: true, name: true } })
  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]))

  // Revenue from commissions
  const revenueResult = await prisma.trade.aggregate({ _sum: { commission: true } })

  // Margin in use
  const marginResult = await prisma.position.aggregate({
    where: { isOpen: true },
    _sum: { margin: true, unrealizedPnL: true },
  })

  // Build daily registration chart data (last 30 days)
  const dailyMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dailyMap[key] = 0
  }
  for (const r of registrationsByDay) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10)
    if (key in dailyMap) dailyMap[key] = (dailyMap[key] ?? 0) + r._count.id
  }
  const dailyChart = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))

  return NextResponse.json({
    totalUsers,
    newToday: todayUsers,
    newThisWeek: weekUsers,
    newThisMonth: monthUsers,
    totalBalance: Number(totalWallets._sum.balance ?? 0),
    totalEquity: Number(totalWallets._sum.equity ?? 0),
    totalMargin: Number(totalWallets._sum.margin ?? 0),
    openPositions,
    marginInUse: Number(marginResult._sum.margin ?? 0),
    totalUnrealizedPnL: Number(marginResult._sum.unrealizedPnL ?? 0),
    todayTrades,
    totalRevenue: Number(revenueResult._sum.commission ?? 0),
    topAssets: topAssets.map((a) => ({
      ...a,
      symbol: assetMap[a.assetId]?.symbol ?? 'Unknown',
      name: assetMap[a.assetId]?.name ?? '',
    })),
    dailyRegistrations: dailyChart,
  })
}
