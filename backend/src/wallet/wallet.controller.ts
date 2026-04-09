import { Body, Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  getWallet(@Request() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  @Post('deposit')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  deposit(@Request() req: any, @Body() dto: { amount: number; method: string }) {
    return this.walletService.deposit(req.user.id, dto);
  }

  @Post('withdraw')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  withdraw(@Request() req: any, @Body() dto: { amount: number; method: string }) {
    return this.walletService.withdraw(req.user.id, dto);
  }

  @Get('transactions')
  getTransactions(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (type || status || limit || offset) {
      return this.walletService.getTransactionsForUser(req.user.id, {
        type,
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
    }
    return this.walletService.getTransactions(req.user.id);
  }

  @Get('deposits/pending')
  getPendingDeposits(@Request() req: any) {
    return this.walletService.getPendingDeposits(req.user.id);
  }

  @Get('plan-summary')
  getPlanSummary(@Request() req: any) {
    return this.walletService.getUserPlanSummary(req.user.id);
  }
}
