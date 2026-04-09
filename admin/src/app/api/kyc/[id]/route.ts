import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const { id } = await params
  const { status, adminNote } = await req.json()

  const kyc = await prisma.kycVerification.findUnique({ where: { id } })
  if (!kyc) return NextResponse.json({ error: 'KYC not found' }, { status: 404 })

  const updated = await prisma.kycVerification.update({
    where: { id },
    data: {
      status,
      adminNote: adminNote ?? null,
      reviewedAt: new Date(),
    },
  })

  await prisma.adminAction.create({
    data: {
      adminId: session!.id,
      action: `KYC_${status}`,
      targetId: kyc.userId,
      details: { kycId: id, status, adminNote },
    },
  })

  return NextResponse.json({ kyc: updated })
}
