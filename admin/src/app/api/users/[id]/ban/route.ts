import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const { id } = await params
  const { ban, reason } = await req.json()

  const user = await prisma.user.update({
    where: { id },
    data: { isBanned: ban, banReason: ban ? reason : null },
  })

  await prisma.adminAction.create({
    data: {
      adminId: session!.id,
      action: ban ? 'BAN_USER' : 'UNBAN_USER',
      targetId: id,
      details: { reason: reason ?? null },
    },
  })

  return NextResponse.json({ isBanned: user.isBanned })
}
