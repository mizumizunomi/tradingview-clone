import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { TradingService } from './trading.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaceOrderDto } from './dto/place-order.dto';

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(private tradingService: TradingService) {}

  @Post('orders')
  placeOrder(@Request() req: { user: { id: string } }, @Body() dto: PlaceOrderDto) {
    return this.tradingService.placeOrder(req.user.id, dto);
  }

  @Get('orders')
  getOrders(@Request() req: { user: { id: string } }) {
    return this.tradingService.getOrders(req.user.id);
  }

  @Get('positions')
  getPositions(@Request() req: { user: { id: string } }) {
    return this.tradingService.getPositions(req.user.id);
  }

  @Get('positions/closed')
  getClosedPositions(@Request() req: { user: { id: string } }) {
    return this.tradingService.getClosedPositions(req.user.id);
  }

  @Post('positions/:id/close')
  closePosition(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.tradingService.closePosition(req.user.id, id);
  }
}
