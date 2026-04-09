import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const kyc = await this.prisma.kycVerification.findUnique({ where: { userId } });
    return { kyc: kyc ?? null };
  }

  async submit(userId: string, dto: {
    fullName: string;
    dateOfBirth: string;
    country: string;
    address: string;
    documentType: string;
    documentFront: string;
    documentBack?: string;
    selfie?: string;
  }) {
    const existing = await this.prisma.kycVerification.findUnique({ where: { userId } });

    if (existing && existing.status === 'APPROVED') {
      throw new BadRequestException('KYC is already approved');
    }

    if (existing) {
      return this.prisma.kycVerification.update({
        where: { userId },
        data: { ...dto, status: 'PENDING', submittedAt: new Date(), reviewedAt: null, adminNote: null },
      });
    }

    return this.prisma.kycVerification.create({
      data: { userId, ...dto },
    });
  }
}
