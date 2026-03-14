import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
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
  deposit(@Request() req: any, @Body() dto: { amount: number; method: string }) {
    return this.walletService.deposit(req.user.id, dto);
  }

  @Post('withdraw')
  withdraw(@Request() req: any, @Body() dto: { amount: number; method: string }) {
    return this.walletService.withdraw(req.user.id, dto);
  }

  @Get('transactions')
  getTransactions(@Request() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }
}
