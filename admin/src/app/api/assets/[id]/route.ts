import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['spread', 'commission', 'minOrderSize', 'maxLeverage', 'isActive', 'isFeatured']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const asset = await prisma.asset.update({ where: { id }, data })

  await prisma.adminAction.create({
    data: { adminId: session.id, action: 'EDIT_ASSET', targetId: id, details: data as import('@prisma/client').Prisma.InputJsonValue },
  })

  return NextResponse.json(asset)
}
