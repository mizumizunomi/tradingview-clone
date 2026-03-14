import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { TradingService } from './trading.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(private tradingService: TradingService) {}

  @Post('orders')
  placeOrder(@Request() req: any, @Body() dto: any) {
    return this.tradingService.placeOrder(req.user.id, dto);
  }

  @Get('orders')
  getOrders(@Request() req: any) {
    return this.tradingService.getOrders(req.user.id);
  }

  @Get('positions')
  getPositions(@Request() req: any) {
    return this.tradingService.getPositions(req.user.id);
  }

  @Get('positions/closed')
  getClosedPositions(@Request() req: any) {
    return this.tradingService.getClosedPositions(req.user.id);
  }

  @Post('positions/:id/close')
  closePosition(@Request() req: any, @Param('id') id: string) {
    return this.tradingService.closePosition(req.user.id, id);
  }
}
