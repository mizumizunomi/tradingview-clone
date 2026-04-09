import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: { subject: string; message: string; priority?: string }) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        message: dto.message,
        priority: (dto.priority as any) ?? 'NORMAL',
      },
    });
  }

  async getUserTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicket(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.userId !== userId) throw new NotFoundException('Ticket not found');
    return ticket;
  }
}
