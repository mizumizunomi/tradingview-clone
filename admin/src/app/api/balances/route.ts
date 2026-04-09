import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'SUPPORT')
  if (denied) return denied

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const search = searchParams.get('search') ?? ''
  const minBalance = parseFloat(searchParams.get('minBalance') ?? '0') || 0
  const maxBalance = parseFloat(searchParams.get('maxBalance') ?? '') || undefined

  const where: import('@prisma/client').Prisma.UserWhereInput = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (minBalance > 0 || maxBalance) {
    where.wallet = { balance: { gte: minBalance, ...(maxBalance ? { lte: maxBalance } : {}) } }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { wallet: { balance: 'desc' } },
      select: {
        id: true, email: true, username: true, plan: true,
        wallet: { select: { balance: true, equity: true, margin: true, freeMargin: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const { userIds, amount, reason } = await req.json()
  if (!Array.isArray(userIds) || userIds.length === 0) return NextResponse.json({ error: 'No users selected' }, { status: 400 })
  if (!amount || !reason?.trim()) return NextResponse.json({ error: 'Amount and reason required' }, { status: 400 })

  const results: { userId: string; success: boolean; error?: string }[] = []

  for (const userId of userIds) {
    try {
      const wallet = await prisma.wallet.findUnique({ where: { userId } })
      if (!wallet) { results.push({ userId, success: false, error: 'No wallet' }); continue }
      const newBalance = Number(wallet.balance) + amount
      if (newBalance < 0) { results.push({ userId, success: false, error: 'Insufficient balance' }); continue }

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId },
          data: { balance: newBalance, equity: Number(wallet.equity) + amount, freeMargin: Number(wallet.freeMargin) + amount },
        }),
        prisma.transaction.create({
          data: { walletId: wallet.id, type: 'ADMIN_ADJUSTMENT', method: 'WIRE_TRANSFER', amount, status: 'COMPLETED', description: reason },
        }),
        prisma.adminAction.create({
          data: { adminId: session!.id, action: 'BALANCE_ADJUST', targetId: userId, details: { before: wallet.balance, after: newBalance, amount, reason } },
        }),
      ])
      results.push({ userId, success: true })
    } catch {
      results.push({ userId, success: false, error: 'DB error' })
    }
  }

  return NextResponse.json({ results })
}
