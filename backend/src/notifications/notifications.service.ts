import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType =
  | 'DEPOSIT_CONFIRMED' | 'DEPOSIT_REJECTED' | 'WITHDRAWAL_COMPLETED'
  | 'POSITION_CLOSED' | 'KYC_APPROVED' | 'KYC_REJECTED' | 'SUPPORT_REPLY' | 'SYSTEM';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: NotificationType, title: string, message: string, data?: object) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, data: data ?? undefined },
    });
  }

  async getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
