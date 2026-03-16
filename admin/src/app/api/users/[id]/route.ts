import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      wallet: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } } },
      positions: {
        include: { asset: { select: { symbol: true, name: true } } },
        orderBy: { openedAt: 'desc' },
        take: 50,
      },
      trades: {
        include: { asset: { select: { symbol: true } } },
        orderBy: { executedAt: 'desc' },
        take: 50,
      },
      orders: {
        include: { asset: { select: { symbol: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { password: _, ...safeUser } = user
  return NextResponse.json(safeUser)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['firstName', 'lastName', 'email', 'plan']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const user = await prisma.user.update({ where: { id }, data })

  await prisma.adminAction.create({
    data: {
      adminId: session.id,
      action: 'EDIT_USER',
      targetId: id,
      details: { changes: data } as import('@prisma/client').Prisma.InputJsonValue,
    },
  })

  const { password: _, ...safeUser } = user
  return NextResponse.json(safeUser)
}
