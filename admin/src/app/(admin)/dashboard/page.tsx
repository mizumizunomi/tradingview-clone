import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Users, Wallet, TrendingUp, BarChart3, DollarSign, Activity } from 'lucide-react'
import { DashboardCharts } from './DashboardCharts'

async function getDashboardData() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers, todayUsers, weekUsers, monthUsers,
    walletAgg, openPositions, todayTrades,
    revenueAgg, marginAgg, topAssets, registrations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.wallet.aggregate({ _sum: { balance: true, equity: true, margin: true } }),
    prisma.position.count({ where: { isOpen: true } }),
    prisma.trade.count({ where: { executedAt: { gte: today } } }),
    prisma.trade.aggregate({ _sum: { commission: true } }),
    prisma.position.aggregate({ where: { isOpen: true }, _sum: { margin: true } }),
    prisma.trade.groupBy({
      by: ['assetId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ${monthAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  ])

  const assetIds = topAssets.map((a) => a.assetId)
  const assetDetails = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, symbol: true, name: true },
  })
  const assetMap = Object.fromEntries(assetDetails.map((a) => [a.id, a]))

  // Build 30-day chart
  const dailyMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    dailyMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const r of registrations) {
    const key = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10)
    if (key in dailyMap) dailyMap[key] = Number(r.count)
  }

  return {
    totalUsers,
    todayUsers,
    weekUsers,
    monthUsers,
    totalBalance: walletAgg._sum.balance ?? 0,
    totalEquity: walletAgg._sum.equity ?? 0,
    openPositions,
    marginInUse: marginAgg._sum.margin ?? 0,
    todayTrades,
    totalRevenue: revenueAgg._sum.commission ?? 0,
    topAssets: topAssets.map((a) => ({
      symbol: assetMap[a.assetId]?.symbol ?? 'Unknown',
      name: assetMap[a.assetId]?.name ?? '',
      count: a._count.id,
    })),
    dailyChart: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
  }
}

export default async function DashboardPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')

  const data = await getDashboardData()

  const stats = [
    { label: 'Total Users', value: formatNumber(data.totalUsers, 0), sub: `+${data.todayUsers} today`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Platform Balance', value: formatCurrency(data.totalBalance), sub: `Equity: ${formatCurrency(data.totalEquity)}`, icon: Wallet, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Open Positions', value: formatNumber(data.openPositions, 0), sub: `Margin: ${formatCurrency(data.marginInUse)}`, icon: Activity, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: "Today's Trades", value: formatNumber(data.todayTrades, 0), sub: 'Executed today', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Revenue', value: formatCurrency(data.totalRevenue), sub: 'All-time commissions', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'New This Month', value: formatNumber(data.monthUsers, 0), sub: `${data.weekUsers} this week`, icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-1">Platform overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-[#1a1d29] border-[#2a2d3a]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts dailyChart={data.dailyChart} topAssets={data.topAssets} />
    </div>
  )
}
