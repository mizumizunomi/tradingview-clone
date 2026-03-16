import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { amount, reason } = await req.json()

  if (!amount || amount === 0) return NextResponse.json({ error: 'Amount required' }, { status: 400 })
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason required' }, { status: 400 })

  const wallet = await prisma.wallet.findUnique({ where: { userId: id } })
  if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

  const newBalance = wallet.balance + amount
  if (newBalance < 0) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })

  const [updatedWallet] = await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: id },
      data: {
        balance: newBalance,
        equity: wallet.equity + amount,
        freeMargin: wallet.freeMargin + amount,
      },
    }),
    prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'ADMIN_ADJUSTMENT',
        method: 'WIRE_TRANSFER',
        amount,
        status: 'COMPLETED',
        description: reason,
      },
    }),
    prisma.adminAction.create({
      data: {
        adminId: session.id,
        action: 'BALANCE_ADJUST',
        targetId: id,
        details: {
          before: wallet.balance,
          after: newBalance,
          amount,
          reason,
        },
      },
    }),
  ])

  return NextResponse.json({ balance: updatedWallet.balance })
}
