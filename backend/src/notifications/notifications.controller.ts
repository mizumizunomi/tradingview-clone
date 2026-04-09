import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@Request() req: any) {
    return this.notificationsService.getForUser(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id).then((count) => ({ count }));
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Patch('mark-all-read')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
