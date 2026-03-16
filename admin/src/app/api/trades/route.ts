import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const tab = searchParams.get('tab') ?? 'open'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 25
  const search = searchParams.get('search') ?? ''

  if (tab === 'open') {
    const where: import('@prisma/client').Prisma.PositionWhereInput = { isOpen: true }
    if (search) {
      where.OR = [
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { asset: { symbol: { contains: search, mode: 'insensitive' } } },
      ]
    }
    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true } },
          asset: { select: { symbol: true, name: true } },
        },
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.position.count({ where }),
    ])
    return NextResponse.json({ items: positions, total, page, pages: Math.ceil(total / limit) })
  }

  if (tab === 'closed') {
    const where: import('@prisma/client').Prisma.PositionWhereInput = { isOpen: false }
    if (search) {
      where.OR = [
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { asset: { symbol: { contains: search, mode: 'insensitive' } } },
      ]
    }
    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          asset: { select: { symbol: true } },
        },
        orderBy: { closedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.position.count({ where }),
    ])
    return NextResponse.json({ items: positions, total, page, pages: Math.ceil(total / limit) })
  }

  if (tab === 'trades') {
    const where: import('@prisma/client').Prisma.TradeWhereInput = {}
    if (search) {
      where.OR = [
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { asset: { symbol: { contains: search, mode: 'insensitive' } } },
      ]
    }
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          asset: { select: { symbol: true } },
        },
        orderBy: { executedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trade.count({ where }),
    ])
    return NextResponse.json({ items: trades, total, page, pages: Math.ceil(total / limit) })
  }

  return NextResponse.json({ items: [], total: 0, page: 1, pages: 1 })
}
