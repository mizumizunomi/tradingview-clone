import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PlanTier = 'NONE' | 'DEFAULT' | 'SILVER' | 'GOLD' | 'PLATINUM';

const TIER_THRESHOLDS: { tier: PlanTier; threshold: number }[] = [
  { tier: 'PLATINUM', threshold: 50000 },
  { tier: 'GOLD', threshold: 10000 },
  { tier: 'SILVER', threshold: 2500 },
  { tier: 'DEFAULT', threshold: 250 },
];

function determineTier(totalDeposited: number): PlanTier {
  for (const { tier, threshold } of TIER_THRESHOLDS) {
    if (totalDeposited >= threshold) return tier;
  }
  return 'NONE';
}

function tierToPlanString(tier: PlanTier): string {
  switch (tier) {
    case 'PLATINUM': return 'platinum';
    case 'GOLD': return 'gold';
    case 'SILVER': return 'silver';
    case 'DEFAULT': return 'default';
    default: return 'none';
  }
}

function getTierThreshold(tier: PlanTier): number {
  switch (tier) {
    case 'PLATINUM': return 50000;
    case 'GOLD': return 10000;
    case 'SILVER': return 2500;
    case 'DEFAULT': return 250;
    default: return 0;
  }
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async deposit(userId: string, dto: { amount: number; method: string }) {
    if (dto.amount < 50) throw new BadRequestException('Minimum deposit is $50');
    if (dto.amount > 100000) throw new BadRequestException('Maximum deposit is $100,000 per transaction');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    // Create PENDING transaction — balance is NOT credited until admin confirms
    const transaction = await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: 'DEPOSIT',
        method: dto.method as any,
        amount: dto.amount,
        status: 'PENDING',
      },
    });

    return {
      transaction,
      message: 'Deposit pending — awaiting payment confirmation',
    };
  }

  async confirmDeposit(transactionId: string, adminId?: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status !== 'PENDING') {
      throw new BadRequestException(`Transaction is already ${transaction.status}`);
    }
    if (transaction.type !== 'DEPOSIT') {
      throw new BadRequestException('Transaction is not a deposit');
    }

    const amount = Number(transaction.amount);
    const userId = transaction.userId!;

    // Mark transaction COMPLETED
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Credit wallet
    const updatedWallet = await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        equity: { increment: amount },
        freeMargin: { increment: amount },
      },
    });

    // Update subscription / tier
    let subscription = await this.prisma.userSubscription.findUnique({ where: { userId } });
    if (!subscription) {
      subscription = await this.prisma.userSubscription.create({ data: { userId } });
    }
    const previousTier = subscription.tier as PlanTier;
    const newTotalDeposited = Number(subscription.totalDeposited) + amount;
    const newTier = determineTier(newTotalDeposited);
    const tierUpgraded = newTier !== previousTier;

    const updatedSubscription = await this.prisma.userSubscription.update({
      where: { userId },
      data: {
        totalDeposited: newTotalDeposited,
        tier: newTier,
        ...(tierUpgraded && previousTier === 'NONE' ? { activatedAt: new Date() } : {}),
      },
    });

    if (tierUpgraded) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { plan: tierToPlanString(newTier) },
      });
    }

    if (adminId) {
      await this.prisma.adminAction.create({
        data: {
          adminId,
          action: 'CONFIRM_DEPOSIT',
          targetId: userId,
          details: { transactionId, amount, newTier, tierUpgraded },
        },
      });
    }

    return { wallet: updatedWallet, subscription: updatedSubscription, tierUpgraded, newTier };
  }

  async rejectDeposit(transactionId: string, reason: string, adminId?: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status !== 'PENDING') {
      throw new BadRequestException(`Transaction is already ${transaction.status}`);
    }

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED', note: reason },
    });

    if (adminId) {
      await this.prisma.adminAction.create({
        data: {
          adminId,
          action: 'REJECT_DEPOSIT',
          targetId: transaction.userId ?? transactionId,
          details: { transactionId, reason },
        },
      });
    }

    return { ok: true };
  }

  async getPendingDeposits(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return this.prisma.transaction.findMany({
      where: { walletId: wallet.id, type: 'DEPOSIT', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async withdraw(userId: string, dto: { amount: number; method: string }) {
    if (dto.amount < 10) throw new BadRequestException('Minimum withdrawal is $10');

    // KYC check: withdrawals require approved KYC
    const kyc = await this.prisma.kycVerification.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== 'APPROVED') {
      throw new BadRequestException('KYC verification required before withdrawals. Please complete identity verification.');
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const fee = Math.max(1, dto.amount * 0.005);
    const totalDeduction = dto.amount + fee;

    if (totalDeduction > Number(wallet.freeMargin)) {
      throw new BadRequestException('Insufficient free margin for withdrawal (amount + fee)');
    }

    // Create withdrawal transaction
    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: 'WITHDRAWAL',
        method: dto.method as any,
        amount: dto.amount,
        status: 'COMPLETED',
        completedAt: new Date(),
        note: `Fee: $${fee.toFixed(2)}`,
      },
    });

    // Create fee transaction
    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: 'TRADE_FEE',
        method: dto.method as any,
        amount: fee,
        status: 'COMPLETED',
        completedAt: new Date(),
        description: 'Withdrawal fee (0.5%)',
      },
    });

    const updatedWallet = await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: totalDeduction },
        equity: { decrement: totalDeduction },
        freeMargin: { decrement: totalDeduction },
      },
    });

    // Check if balance drops below tier threshold
    let warning: string | null = null;
    const subscription = await this.prisma.userSubscription.findUnique({ where: { userId } });
    if (subscription && subscription.tier !== 'NONE') {
      const tierThreshold = getTierThreshold(subscription.tier as PlanTier);
      if (Number(updatedWallet.balance) < tierThreshold) {
        warning = `Your balance has dropped below the $${tierThreshold.toLocaleString()} threshold for your ${subscription.tier} tier. Consider depositing to maintain your tier benefits.`;
      }
    }

    return { wallet: updatedWallet, fee, warning };
  }

  async getTransactions(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactionsForUser(
    userId: string,
    filters: { type?: string; status?: string; limit?: number; offset?: number },
  ) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const where: any = { walletId: wallet.id };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async resetDemoBalance(userId: string) {
    const DEMO_BALANCE = 10000;

    // Close all open positions first
    await this.prisma.position.updateMany({
      where: { userId, isOpen: true },
      data: { isOpen: false, closedAt: new Date() },
    });

    // Cancel pending orders
    await this.prisma.order.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // Reset wallet
    const wallet = await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: DEMO_BALANCE,
        equity: DEMO_BALANCE,
        margin: 0,
        freeMargin: DEMO_BALANCE,
        marginLevel: 0,
      },
    });

    // Log as transaction
    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: 'DEPOSIT',
        method: 'WIRE_TRANSFER',
        amount: DEMO_BALANCE,
        status: 'COMPLETED',
        completedAt: new Date(),
        description: 'Demo account reset — $10,000 virtual balance restored',
      },
    });

    return { wallet, reset: true };
  }

  async getUserPlanSummary(userId: string) {
    const subscription = await this.prisma.userSubscription.findUnique({ where: { userId } });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const tier = subscription.tier as PlanTier;
    const nextTierIndex = TIER_THRESHOLDS.findIndex((t) => t.tier === tier);
    const nextTier = nextTierIndex > 0 ? TIER_THRESHOLDS[nextTierIndex - 1] : null;

    return {
      subscription,
      tier,
      planString: tierToPlanString(tier),
      nextTier: nextTier
        ? {
            tier: nextTier.tier,
            threshold: nextTier.threshold,
            remaining: Math.max(0, nextTier.threshold - Number(subscription.totalDeposited)),
          }
        : null,
    };
  }
}
