import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'
import { computeClosePnL, computeWalletCloseDeltas } from '@/lib/domain/pnl'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const { id: userId } = await params
  const { positionId, currentPrice } = await req.json()

  const position = await prisma.position.findFirst({
    where: { id: positionId, userId, isOpen: true },
    include: { asset: true },
  })
  if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

  const closePrice = currentPrice ?? Number(position.currentPrice)
  const posMargin = Number(position.margin)

  // Canonical close math (mirror of backend) — must match user-initiated close exactly.
  const { pnl, closeCommission } = computeClosePnL({
    side: position.side as 'BUY' | 'SELL',
    entryPrice: Number(position.entryPrice),
    closePrice,
    quantity: position.quantity,
    leverage: position.leverage,
    openCommission: Number(position.commission),
    assetCommissionRate: Number(position.asset.commission),
  })
  const deltas = computeWalletCloseDeltas(posMargin, pnl, closeCommission)

  await prisma.$transaction([
    prisma.position.update({
      where: { id: positionId },
      data: {
        isOpen: false,
        closedAt: new Date(),
        currentPrice: closePrice,
        realizedPnL: pnl,
        unrealizedPnL: 0,
      },
    }),
    prisma.wallet.update({
      where: { userId },
      data: {
        balance: { increment: deltas.balanceDelta },
        margin: { increment: deltas.marginDelta },
        freeMargin: { increment: deltas.freeMarginDelta },
      },
    }),
    prisma.trade.create({
      data: {
        userId,
        assetId: position.assetId,
        positionId,
        type: 'CLOSE',
        side: position.side === 'BUY' ? 'SELL' : 'BUY',
        quantity: position.quantity,
        price: closePrice,
        pnl,
        commission: closeCommission,
      },
    }),
    prisma.adminAction.create({
      data: {
        adminId: session!.id,
        action: 'CLOSE_POSITION',
        targetId: positionId,
        details: { userId, symbol: position.asset.symbol, pnl, closePrice },
      },
    }),
  ])

  return NextResponse.json({ ok: true, pnl })
}
