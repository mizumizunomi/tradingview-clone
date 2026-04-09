import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const { id: transactionId } = await params
  const { reason } = await req.json()

  if (!reason?.trim()) return NextResponse.json({ error: 'Reason required' }, { status: 400 })

  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (transaction.status !== 'PENDING') {
    return NextResponse.json({ error: `Transaction is already ${transaction.status}` }, { status: 400 })
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'FAILED', note: reason },
  })

  await prisma.adminAction.create({
    data: {
      adminId: session!.id,
      action: 'REJECT_DEPOSIT',
      targetId: transaction.userId ?? transactionId,
      details: { transactionId, reason },
    },
  })

  return NextResponse.json({ ok: true })
}
