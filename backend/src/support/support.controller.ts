import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportService } from './support.service';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  createTicket(@Request() req: any, @Body() dto: { subject: string; message: string; priority?: string }) {
    return this.supportService.createTicket(req.user.id, dto);
  }

  @Get('tickets')
  getTickets(@Request() req: any) {
    return this.supportService.getUserTickets(req.user.id);
  }

  @Get('tickets/:id')
  getTicket(@Request() req: any, @Param('id') id: string) {
    return this.supportService.getTicket(req.user.id, id);
  }
}
