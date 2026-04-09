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
  const plan = searchParams.get('plan') ?? ''
  const status = searchParams.get('status') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'createdAt'
  const sortDir = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc'

  const where: import('@prisma/client').Prisma.UserWhereInput = {}

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { id: { contains: search } },
    ]
  }
  if (plan) where.plan = plan
  if (status === 'banned') where.isBanned = true
  if (status === 'active') where.isBanned = false

  const validSorts = ['createdAt', 'email', 'username', 'plan']
  const orderBy: Record<string, 'asc' | 'desc'> = {}
  orderBy[validSorts.includes(sortBy) ? sortBy : 'createdAt'] = sortDir

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, username: true, firstName: true, lastName: true,
        plan: true, isBanned: true, banReason: true, createdAt: true,
        wallet: { select: { balance: true, equity: true, margin: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) })
}
