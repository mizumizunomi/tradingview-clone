import {
  Injectable, BadRequestException, ForbiddenException,
  NotFoundException, OnModuleInit, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { PlanService } from '../plan/plan.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlaceOrderDto } from './dto/place-order.dto';

@Injectable()
export class TradingService implements OnModuleInit {
  private readonly logger = new Logger(TradingService.name);
  private onPositionClosed?: (userId: string, positionId: string, pnl: number) => void;
  private onPositionOpened?: (userId: string, positionId: string) => void;
  private onEquityUpdate?: (userId: string, equity: number, freeMargin: number, margin: number) => void;

  constructor(
    private prisma: PrismaService,
    private marketData: MarketDataService,
    private planService: PlanService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.startSlTpMonitor();
    this.startLimitOrderMonitor();
  }

  setPositionClosedCallback(cb: (userId: string, positionId: string, pnl: number) => void) {
    this.onPositionClosed = cb;
  }

  setPositionOpenedCallback(cb: (userId: string, positionId: string) => void) {
    this.onPositionOpened = cb;
  }

  setEquityUpdateCallback(cb: (userId: string, equity: number, freeMargin: number, margin: number) => void) {
    this.onEquityUpdate = cb;
  }

  // ── SL/TP auto-close monitor ──────────────────────────────────────────────
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
          let triggerType: 'SL' | 'TP' | null = null;

          if (pos.stopLoss) {
            const sl = Number(pos.stopLoss);
            if (pos.side === 'BUY' && price <= sl) triggerType = 'SL';
            if (pos.side === 'SELL' && price >= sl) triggerType = 'SL';
          }
          if (!triggerType && pos.takeProfit) {
            const tp = Number(pos.takeProfit);
            if (pos.side === 'BUY' && price >= tp) triggerType = 'TP';
            if (pos.side === 'SELL' && price <= tp) triggerType = 'TP';
          }

          if (triggerType) {
            const result = await this.closePositionInternal(pos.userId, pos.id, price);
            if (this.onPositionClosed) {
              this.onPositionClosed(pos.userId, pos.id, result.pnl);
            }
            // In-app notification
            const label = triggerType === 'SL' ? 'Stop Loss' : 'Take Profit';
            await this.notifications.create(
              pos.userId,
              'POSITION_CLOSED',
              `${label} triggered — ${pos.asset.symbol}`,
              `Your ${pos.side} position on ${pos.asset.symbol} was closed at $${price.toFixed(5)} by ${label}. P&L: ${result.pnl >= 0 ? '+' : ''}$${result.pnl.toFixed(2)}`,
              { positionId: pos.id, pnl: result.pnl, triggerType, price },
            );
            // Email notification: not yet implemented (no SMTP transport wired up despite
            // nodemailer being a dependency) — in-app notification above covers this event for now.
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
            const diff = pos.side === 'BUY'
              ? pd.price - Number(pos.entryPrice)
              : Number(pos.entryPrice) - pd.price;
            unrealizedPnL += diff * pos.quantity * pos.leverage - Number(pos.commission);
          }
          const equity = Number(wallet.balance) + unrealizedPnL;
          const freeMargin = equity - Number(wallet.margin);
          await this.prisma.wallet.update({
            where: { userId },
            data: { equity, freeMargin },
          });
          if (this.onEquityUpdate) {
            this.onEquityUpdate(userId, equity, freeMargin, Number(wallet.margin));
          }
        }
      } catch (err: unknown) {
        this.logger.error('SL/TP monitor error', err instanceof Error ? err.stack : String(err));
      }
    }, 3000);
  }

  // ── Limit order fill monitor ──────────────────────────────────────────────
  private startLimitOrderMonitor() {
    setInterval(async () => {
      try {
        const pendingOrders = await this.prisma.order.findMany({
          where: { status: 'PENDING', type: 'LIMIT' },
          include: { asset: true },
        });

        for (const order of pendingOrders) {
          const priceData = this.marketData.getPrice(order.asset.symbol);
          if (!priceData || !order.limitPrice) continue;

          const currentPrice = priceData.price;
          const limitPrice = Number(order.limitPrice);

          // BUY limit fills when market price drops to or below limit
          // SELL limit fills when market price rises to or above limit
          const shouldFill =
            (order.side === 'BUY' && currentPrice <= limitPrice) ||
            (order.side === 'SELL' && currentPrice >= limitPrice);

          if (!shouldFill) continue;

          const fillPrice = limitPrice;

          // Check wallet still has enough margin
          const wallet = await this.prisma.wallet.findUnique({ where: { userId: order.userId } });
          if (!wallet) continue;
          const margin = Number(order.margin);
          if (margin > Number(wallet.freeMargin)) {
            // Cancel order — insufficient funds
            await this.prisma.order.update({
              where: { id: order.id },
              data: { status: 'CANCELLED' },
            });
            await this.notifications.create(
              order.userId,
              'SYSTEM',
              `Limit order cancelled — ${order.asset.symbol}`,
              `Your ${order.side} limit order on ${order.asset.symbol} was cancelled due to insufficient margin.`,
            );
            continue;
          }

          // Fill the order
          await this.prisma.order.update({
            where: { id: order.id },
            data: { status: 'FILLED', filledAt: new Date(), filledPrice: fillPrice },
          });

          const position = await this.prisma.position.create({
            data: {
              userId: order.userId,
              assetId: order.assetId,
              orderId: order.id,
              side: order.side,
              quantity: order.quantity,
              leverage: order.leverage,
              entryPrice: fillPrice,
              currentPrice: fillPrice,
              stopLoss: order.stopLoss ?? null,
              takeProfit: order.takeProfit ?? null,
              unrealizedPnL: 0,
              realizedPnL: 0,
              margin,
              commission: Number(order.commission),
              spread: Number(order.spread),
              swap: 0,
              isOpen: true,
            },
          });

          await this.prisma.trade.create({
            data: {
              userId: order.userId,
              assetId: order.assetId,
              positionId: position.id,
              type: 'OPEN',
              side: order.side,
              quantity: order.quantity,
              price: fillPrice,
              pnl: 0,
              commission: Number(order.commission),
            },
          });

          await this.prisma.wallet.update({
            where: { userId: order.userId },
            data: {
              margin: { increment: margin },
              freeMargin: { decrement: margin },
              balance: { decrement: Number(order.commission) },
            },
          });

          if (this.onPositionOpened) {
            this.onPositionOpened(order.userId, position.id);
          }

          await this.notifications.create(
            order.userId,
            'POSITION_CLOSED',
            `Limit order filled — ${order.asset.symbol}`,
            `Your ${order.side} limit order on ${order.asset.symbol} was filled at $${fillPrice.toFixed(5)}.`,
            { positionId: position.id, fillPrice },
          );
        }
      } catch (err: unknown) {
        this.logger.error('Limit order monitor error', err instanceof Error ? err.stack : String(err));
      }
    }, 3000);
  }

  // ── Place order ────────────────────────────────────────────────────────────
  async placeOrder(userId: string, dto: PlaceOrderDto) {
    const canTrade = await this.planService.canTrade(userId);
    if (!canTrade) {
      throw new ForbiddenException(
        'Your current plan does not allow trading. Please deposit to activate your plan.'
      );
    }

    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const hasAssetAccess = await this.planService.canAccessAsset(userId, asset.symbol, asset.category);
    if (!hasAssetAccess) {
      const tier = await this.planService.getUserTier(userId);
      const tierConfig = this.planService.getTierConfig(tier);
      throw new ForbiddenException(
        `This asset is not available on your ${tierConfig.label} plan. Please upgrade to access more assets.`
      );
    }

    const canOpen = await this.planService.canOpenPosition(userId);
    if (!canOpen) {
      const tier = await this.planService.getUserTier(userId);
      const tierConfig = this.planService.getTierConfig(tier);
      throw new ForbiddenException(
        `You have reached the maximum number of open positions (${tierConfig.maxPositions}) for your ${tierConfig.label} plan. Upgrade to open more positions.`
      );
    }

    const leverage = dto.leverage || 1;
    const maxLeverage = await this.planService.getMaxLeverage(userId);
    if (leverage > maxLeverage) {
      throw new BadRequestException(
        `Leverage ${leverage}× exceeds your plan limit of ${maxLeverage}×. Upgrade your plan for higher leverage.`
      );
    }

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
    const marketPrice = priceData
      ? (dto.side === 'BUY' ? priceData.ask : priceData.bid)
      : 100;

    // ── LIMIT order: use limitPrice as reference, validate it makes sense ──
    if (orderType === 'LIMIT') {
      if (!dto.limitPrice) {
        throw new BadRequestException('Limit price is required for LIMIT orders');
      }
      if (dto.side === 'BUY' && dto.limitPrice >= marketPrice) {
        throw new BadRequestException(
          `BUY limit price ($${dto.limitPrice.toFixed(5)}) must be below current market price ($${marketPrice.toFixed(5)})`
        );
      }
      if (dto.side === 'SELL' && dto.limitPrice <= marketPrice) {
        throw new BadRequestException(
          `SELL limit price ($${dto.limitPrice.toFixed(5)}) must be above current market price ($${marketPrice.toFixed(5)})`
        );
      }
    }

    // ── SL/TP validation for market orders ────────────────────────────────
    const refPrice = orderType === 'LIMIT' ? dto.limitPrice! : marketPrice;
    if (dto.stopLoss) {
      if (dto.side === 'BUY' && dto.stopLoss >= refPrice) {
        throw new BadRequestException(
          `Stop Loss ($${dto.stopLoss.toFixed(5)}) must be below the entry price ($${refPrice.toFixed(5)}) for a BUY order`
        );
      }
      if (dto.side === 'SELL' && dto.stopLoss <= refPrice) {
        throw new BadRequestException(
          `Stop Loss ($${dto.stopLoss.toFixed(5)}) must be above the entry price ($${refPrice.toFixed(5)}) for a SELL order`
        );
      }
    }
    if (dto.takeProfit) {
      if (dto.side === 'BUY' && dto.takeProfit <= refPrice) {
        throw new BadRequestException(
          `Take Profit ($${dto.takeProfit.toFixed(5)}) must be above the entry price ($${refPrice.toFixed(5)}) for a BUY order`
        );
      }
      if (dto.side === 'SELL' && dto.takeProfit >= refPrice) {
        throw new BadRequestException(
          `Take Profit ($${dto.takeProfit.toFixed(5)}) must be below the entry price ($${refPrice.toFixed(5)}) for a SELL order`
        );
      }
    }

    const quantity = dto.quantity;
    const notionalValue = refPrice * quantity;
    const margin = notionalValue / leverage;
    const commissionRate = await this.planService.getCommissionRate(userId);
    const commission = notionalValue * commissionRate;
    const spread = Number(asset.spread) * refPrice;

    if (margin > Number(wallet.freeMargin)) {
      throw new BadRequestException(
        `Insufficient margin. Required: $${margin.toFixed(2)}, Available: $${Number(wallet.freeMargin).toFixed(2)}`
      );
    }

    // ── LIMIT order: create PENDING order, reserve margin ─────────────────
    if (orderType === 'LIMIT') {
      const order = await this.prisma.order.create({
        data: {
          userId, assetId: dto.assetId,
          type: orderType,
          side: dto.side, quantity, leverage,
          entryPrice: marketPrice,
          stopLoss: dto.stopLoss || null,
          takeProfit: dto.takeProfit || null,
          limitPrice: dto.limitPrice!,
          status: 'PENDING',
          filledAt: null,
          filledPrice: null,
          margin, commission, spread,
        },
      });

      // Reserve margin immediately so user can't over-leverage
      await this.prisma.wallet.update({
        where: { userId },
        data: {
          freeMargin: { decrement: margin },
          margin: { increment: margin },
        },
      });

      return { order, position: null, pending: true };
    }

    // ── MARKET order: fill immediately ────────────────────────────────────
    const price = marketPrice;
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
      : Number(pos.currentPrice);
    return this.closePositionInternal(userId, positionId, closePrice);
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: 'PENDING' },
    });
    if (!order) throw new NotFoundException('Pending order not found');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    // Release reserved margin
    await this.prisma.wallet.update({
      where: { userId },
      data: {
        freeMargin: { increment: Number(order.margin) },
        margin: { decrement: Number(order.margin) },
      },
    });

    return { cancelled: true };
  }

  private async closePositionInternal(userId: string, positionId: string, closePrice: number) {
    const position = await this.prisma.position.findFirst({
      where: { id: positionId, userId, isOpen: true },
      include: { asset: true },
    });
    if (!position) throw new NotFoundException('Position not found');

    const priceDiff = position.side === 'BUY'
      ? closePrice - Number(position.entryPrice)
      : Number(position.entryPrice) - closePrice;

    const pnl = priceDiff * position.quantity * position.leverage - Number(position.commission);
    const closeCommission = closePrice * position.quantity * Number(position.asset.commission);

    await this.prisma.position.update({
      where: { id: positionId },
      data: {
        currentPrice: closePrice, realizedPnL: pnl,
        unrealizedPnL: 0, isOpen: false, closedAt: new Date(),
      },
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
        margin: { decrement: Number(position.margin) },
        freeMargin: { increment: Number(position.margin) + pnl - closeCommission },
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
