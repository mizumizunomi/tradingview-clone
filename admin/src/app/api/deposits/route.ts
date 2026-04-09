import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const deposits = await prisma.transaction.findMany({
    where: { type: 'DEPOSIT', status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      wallet: {
        include: {
          user: { select: { id: true, email: true, username: true, plan: true } },
        },
      },
    },
  })

  return NextResponse.json({ deposits })
}
