import { Injectable, BadRequestException, ForbiddenException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class TradingService implements OnModuleInit {
  private onPositionClosed?: (userId: string, positionId: string, pnl: number) => void;
  private onEquityUpdate?: (userId: string, equity: number, freeMargin: number, margin: number) => void;

  constructor(
    private prisma: PrismaService,
    private marketData: MarketDataService,
    private planService: PlanService,
  ) {}

  onModuleInit() {
    this.startSlTpMonitor();
  }

  setPositionClosedCallback(cb: (userId: string, positionId: string, pnl: number) => void) {
    this.onPositionClosed = cb;
  }

  setEquityUpdateCallback(cb: (userId: string, equity: number, freeMargin: number, margin: number) => void) {
    this.onEquityUpdate = cb;
  }

  private startSlTpMonitor() {
    setInterval(async () => {
      try {
        const openPositions = await this.prisma.position.findMany({
          where: { isOpen: true },
          include: { asset: true },
        });

        for (const pos of openPositions) {
          const priceData = this.marketData.getPrice(pos.asset.symbol);
          if (!priceData) continue;

          const price = priceData.price;
          let shouldClose = false;

          if (pos.stopLoss) {
            if (pos.side === 'BUY' && price <= pos.stopLoss) shouldClose = true;
            if (pos.side === 'SELL' && price >= pos.stopLoss) shouldClose = true;
          }
          if (pos.takeProfit) {
            if (pos.side === 'BUY' && price >= pos.takeProfit) shouldClose = true;
            if (pos.side === 'SELL' && price <= pos.takeProfit) shouldClose = true;
          }

          if (shouldClose) {
            const result = await this.closePositionInternal(pos.userId, pos.id, price);
            if (this.onPositionClosed) {
              this.onPositionClosed(pos.userId, pos.id, result.pnl);
            }
          }
        }

        // Update equity for all users with open positions
        const userIds = [...new Set(openPositions.map(p => p.userId))];
        for (const userId of userIds) {
          const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
          if (!wallet) continue;
          const userPositions = openPositions.filter(p => p.userId === userId);
          let unrealizedPnL = 0;
          for (const pos of userPositions) {
            const pd = this.marketData.getPrice(pos.asset.symbol);
            if (!pd) continue;
            const diff = pos.side === 'BUY' ? pd.price - pos.entryPrice : pos.entryPrice - pd.price;
            unrealizedPnL += diff * pos.quantity * pos.leverage - pos.commission;
          }
          const equity = wallet.balance + unrealizedPnL;
          const freeMargin = equity - wallet.margin;
          await this.prisma.wallet.update({
            where: { userId },
            data: { equity, freeMargin },
          });
          if (this.onEquityUpdate) {
            this.onEquityUpdate(userId, equity, freeMargin, wallet.margin);
          }
        }
      } catch {}
    }, 3000);
  }

  async placeOrder(userId: string, dto: any) {
    // Get user tier via PlanService
    const canTrade = await this.planService.canTrade(userId);
    if (!canTrade) {
      throw new ForbiddenException(
        'Your current plan does not allow trading. Please deposit to activate your plan.'
      );
    }

    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    // Check asset access via PlanService
    const hasAssetAccess = await this.planService.canAccessAsset(userId, asset.symbol, asset.category);
    if (!hasAssetAccess) {
      const tier = await this.planService.getUserTier(userId);
      const tierConfig = this.planService.getTierConfig(tier);
      throw new ForbiddenException(
        `This asset is not available on your ${tierConfig.label} plan. Please upgrade to access more assets.`
      );
    }

    // Check position limit via PlanService
    const canOpen = await this.planService.canOpenPosition(userId);
    if (!canOpen) {
      const tier = await this.planService.getUserTier(userId);
      const tierConfig = this.planService.getTierConfig(tier);
      throw new ForbiddenException(
        `You have reached the maximum number of open positions (${tierConfig.maxPositions}) for your ${tierConfig.label} plan. Upgrade to open more positions.`
      );
    }

    // Check leverage via PlanService
    const leverage = dto.leverage || 1;
    const maxLeverage = await this.planService.getMaxLeverage(userId);
    if (leverage > maxLeverage) {
      throw new BadRequestException(
        `Leverage ${leverage}× exceeds your plan limit of ${maxLeverage}×. Upgrade your plan for higher leverage.`
      );
    }

    // Check order type
    const orderType = dto.type || 'MARKET';
    const availableOrderTypes = await this.planService.getAvailableOrderTypes(userId);
    if (!availableOrderTypes.includes(orderType)) {
      throw new BadRequestException(
        `Order type "${orderType}" is not available on your current plan. Upgrade to access advanced order types.`
      );
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const priceData = this.marketData.getPrice(asset.symbol);
    const price = priceData
      ? (dto.side === 'BUY' ? priceData.ask : priceData.bid)
      : 100;

    const quantity = dto.quantity;
    const notionalValue = price * quantity;
    const margin = notionalValue / leverage;
    // Use plan commission rate via PlanService
    const commissionRate = await this.planService.getCommissionRate(userId);
    const commission = notionalValue * commissionRate;
    const spread = asset.spread * price;

    if (margin > wallet.freeMargin) {
      throw new BadRequestException(`Insufficient margin. Required: $${margin.toFixed(2)}, Available: $${wallet.freeMargin.toFixed(2)}`);
    }

    const order = await this.prisma.order.create({
      data: {
        userId, assetId: dto.assetId,
        type: orderType,
        side: dto.side, quantity, leverage,
        entryPrice: price,
        stopLoss: dto.stopLoss || null,
        takeProfit: dto.takeProfit || null,
        limitPrice: dto.limitPrice || null,
        status: 'FILLED',
        filledAt: new Date(), filledPrice: price,
        margin, commission, spread,
      },
    });

    const position = await this.prisma.position.create({
      data: {
        userId, assetId: dto.assetId, orderId: order.id,
        side: dto.side, quantity, leverage,
        entryPrice: price, currentPrice: price,
        stopLoss: dto.stopLoss || null,
        takeProfit: dto.takeProfit || null,
        unrealizedPnL: 0, realizedPnL: 0,
        margin, commission, spread, swap: 0, isOpen: true,
      },
    });

    await this.prisma.trade.create({
      data: {
        userId, assetId: dto.assetId, positionId: position.id,
        type: 'OPEN', side: dto.side, quantity, price, pnl: 0, commission,
      },
    });

    await this.prisma.wallet.update({
      where: { userId },
      data: {
        margin: { increment: margin },
        freeMargin: { decrement: margin },
        balance: { decrement: commission },
      },
    });

    return { order, position };
  }

  async closePosition(userId: string, positionId: string) {
    const pos = await this.prisma.position.findFirst({
      where: { id: positionId, userId, isOpen: true },
      include: { asset: true },
    });
    if (!pos) throw new NotFoundException('Position not found');
    const priceData = this.marketData.getPrice(pos.asset.symbol);
    const closePrice = priceData
      ? (pos.side === 'BUY' ? priceData.bid : priceData.ask)
      : pos.currentPrice;
    return this.closePositionInternal(userId, positionId, closePrice);
  }

  private async closePositionInternal(userId: string, positionId: string, closePrice: number) {
    const position = await this.prisma.position.findFirst({
      where: { id: positionId, userId, isOpen: true },
      include: { asset: true },
    });
    if (!position) throw new NotFoundException('Position not found');

    const priceDiff = position.side === 'BUY'
      ? closePrice - position.entryPrice
      : position.entryPrice - closePrice;

    const pnl = priceDiff * position.quantity * position.leverage - position.commission;
    const closeCommission = closePrice * position.quantity * position.asset.commission;

    await this.prisma.position.update({
      where: { id: positionId },
      data: { currentPrice: closePrice, realizedPnL: pnl, unrealizedPnL: 0, isOpen: false, closedAt: new Date() },
    });

    await this.prisma.trade.create({
      data: {
        userId, assetId: position.assetId, positionId: position.id,
        type: 'CLOSE',
        side: position.side === 'BUY' ? 'SELL' : 'BUY',
        quantity: position.quantity, price: closePrice, pnl, commission: closeCommission,
      },
    });

    await this.prisma.wallet.update({
      where: { userId },
      data: {
        margin: { decrement: position.margin },
        freeMargin: { increment: position.margin + pnl - closeCommission },
        balance: { increment: pnl - closeCommission },
      },
    });

    return { position: { ...position, realizedPnL: pnl, isOpen: false }, pnl };
  }

  async getPositions(userId: string) {
    return this.prisma.position.findMany({
      where: { userId, isOpen: true },
      include: { asset: true },
      orderBy: { openedAt: 'desc' },
    });
  }

  async getClosedPositions(userId: string) {
    return this.prisma.position.findMany({
      where: { userId, isOpen: false },
      include: { asset: true },
      orderBy: { closedAt: 'desc' },
      take: 100,
    });
  }

  async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
