import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function GET() {
  const session = await getAdminSession()
  const denied = requireRole(session, 'SUPPORT')
  if (denied) return denied

  const submissions = await prisma.kycVerification.findMany({
    orderBy: { submittedAt: 'desc' },
    include: { user: { select: { id: true, email: true, username: true } } },
  })

  return NextResponse.json({ submissions })
}
