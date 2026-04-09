import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 25
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''

  const where: import('@prisma/client').Prisma.AssetWhereInput = {}
  if (search) {
    where.OR = [
      { symbol: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category) where.category = category as import('@prisma/client').AssetCategory

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({ where, orderBy: [{ isFeatured: 'desc' }, { symbol: 'asc' }], skip: (page - 1) * limit, take: limit }),
    prisma.asset.count({ where }),
  ])

  return NextResponse.json({ assets, total, page, pages: Math.ceil(total / limit) })
}
