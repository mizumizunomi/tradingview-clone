import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');
    if (dto.amount > 1000000) throw new BadRequestException('Maximum deposit is $1,000,000');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        method: dto.method as any,
        amount: dto.amount,
        status: 'COMPLETED',
      },
    });

    return this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { increment: dto.amount },
        equity: { increment: dto.amount },
        freeMargin: { increment: dto.amount },
      },
    });
  }

  async withdraw(userId: string, dto: { amount: number; method: string }) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (dto.amount > wallet.freeMargin) {
      throw new BadRequestException('Insufficient free margin for withdrawal');
    }

    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'WITHDRAWAL',
        method: dto.method as any,
        amount: dto.amount,
        status: 'COMPLETED',
      },
    });

    return this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: dto.amount },
        equity: { decrement: dto.amount },
        freeMargin: { decrement: dto.amount },
      },
    });
  }

  async getTransactions(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
