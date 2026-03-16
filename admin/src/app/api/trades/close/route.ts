import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { positionId } = await req.json()

  const position = await prisma.position.findUnique({
    where: { id: positionId, isOpen: true },
    include: { asset: true },
  })
  if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

  const closePrice = position.currentPrice
  const priceDiff = closePrice - position.entryPrice
  const pnl = position.side === 'BUY'
    ? priceDiff * position.quantity * position.leverage
    : -priceDiff * position.quantity * position.leverage

  await prisma.$transaction([
    prisma.position.update({
      where: { id: positionId },
      data: { isOpen: false, closedAt: new Date(), realizedPnL: pnl, unrealizedPnL: 0 },
    }),
    prisma.wallet.update({
      where: { userId: position.userId },
      data: {
        balance: { increment: position.margin + pnl },
        margin: { decrement: position.margin },
        freeMargin: { increment: position.margin + pnl },
      },
    }),
    prisma.trade.create({
      data: {
        userId: position.userId,
        assetId: position.assetId,
        positionId,
        type: 'CLOSE',
        side: position.side === 'BUY' ? 'SELL' : 'BUY',
        quantity: position.quantity,
        price: closePrice,
        pnl,
        commission: position.commission,
      },
    }),
    prisma.adminAction.create({
      data: {
        adminId: session.id,
        action: 'CLOSE_POSITION',
        targetId: positionId,
        details: { userId: position.userId, symbol: position.asset.symbol, pnl, closePrice },
      },
    }),
  ])

  return NextResponse.json({ ok: true, pnl })
}
