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
  return <UserDetailClient user={safeUser} adminRole={session.role} />
}
