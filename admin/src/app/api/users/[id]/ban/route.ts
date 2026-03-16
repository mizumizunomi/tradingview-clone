import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { ban, reason } = await req.json()

  const user = await prisma.user.update({
    where: { id },
    data: { isBanned: ban, banReason: ban ? reason : null },
  })

  await prisma.adminAction.create({
    data: {
      adminId: session.id,
      action: ban ? 'BAN_USER' : 'UNBAN_USER',
      targetId: id,
      details: { reason: reason ?? null },
    },
  })

  return NextResponse.json({ isBanned: user.isBanned })
}
