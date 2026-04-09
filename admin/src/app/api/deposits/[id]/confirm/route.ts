import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

type PlanTier = 'NONE' | 'DEFAULT' | 'SILVER' | 'GOLD' | 'PLATINUM'

const TIER_THRESHOLDS: { tier: PlanTier; threshold: number }[] = [
  { tier: 'PLATINUM', threshold: 50000 },
  { tier: 'GOLD', threshold: 10000 },
  { tier: 'SILVER', threshold: 2500 },
  { tier: 'DEFAULT', threshold: 250 },
]

function determineTier(total: number): PlanTier {
  for (const { tier, threshold } of TIER_THRESHOLDS) {
    if (total >= threshold) return tier
  }
  return 'NONE'
}

function tierToPlanString(tier: PlanTier): string {
  const map: Record<PlanTier, string> = { PLATINUM: 'platinum', GOLD: 'gold', SILVER: 'silver', DEFAULT: 'default', NONE: 'none' }
  return map[tier]
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'MANAGER')
  if (denied) return denied

  const { id: transactionId } = await params

  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (transaction.status !== 'PENDING') {
    return NextResponse.json({ error: `Transaction is already ${transaction.status}` }, { status: 400 })
  }
  if (transaction.type !== 'DEPOSIT') {
    return NextResponse.json({ error: 'Not a deposit transaction' }, { status: 400 })
  }

  const amount = Number(transaction.amount)
  const userId = transaction.userId!

  // Mark COMPLETED
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  // Credit wallet
  const updatedWallet = await prisma.wallet.update({
    where: { userId },
    data: {
      balance: { increment: amount },
      equity: { increment: amount },
      freeMargin: { increment: amount },
    },
  })

  // Update subscription / tier
  let subscription = await prisma.userSubscription.findUnique({ where: { userId } })
  if (!subscription) {
    subscription = await prisma.userSubscription.create({ data: { userId } })
  }
  const previousTier = subscription.tier as PlanTier
  const newTotalDeposited = Number(subscription.totalDeposited) + amount
  const newTier = determineTier(newTotalDeposited)
  const tierUpgraded = newTier !== previousTier

  await prisma.userSubscription.update({
    where: { userId },
    data: {
      totalDeposited: newTotalDeposited,
      tier: newTier,
      ...(tierUpgraded && previousTier === 'NONE' ? { activatedAt: new Date() } : {}),
    },
  })

  if (tierUpgraded) {
    await prisma.user.update({ where: { id: userId }, data: { plan: tierToPlanString(newTier) } })
  }

  // Audit log
  await prisma.adminAction.create({
    data: {
      adminId: session!.id,
      action: 'CONFIRM_DEPOSIT',
      targetId: userId,
      details: { transactionId, amount, newTier, tierUpgraded },
    },
  })

  // Notify user
  await prisma.notification.create({
    data: {
      userId,
      type: 'DEPOSIT_CONFIRMED',
      title: 'Deposit Confirmed',
      message: `Your deposit of $${amount.toLocaleString()} has been confirmed and credited to your account.${tierUpgraded ? ` You've been upgraded to ${newTier} tier!` : ''}`,
      data: { transactionId, amount, newTier, tierUpgraded },
    },
  })

  return NextResponse.json({
    ok: true,
    wallet: updatedWallet,
    tierUpgraded,
    newTier,
  })
}
