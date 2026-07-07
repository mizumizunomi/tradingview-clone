import { Injectable } from '@nestjs/common';
import { AssetCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string) {
    const where = category && category !== 'ALL'
      ? { category: category as AssetCategory, isActive: true }
      : { isActive: true };

    return this.prisma.asset.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { symbol: 'asc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.asset.findUnique({ where: { id } });
  }

  async findBySymbol(symbol: string) {
    return this.prisma.asset.findUnique({ where: { symbol } });
  }

  async search(query: string, category?: string) {
    const where: {
      isActive: boolean;
      category?: AssetCategory;
      OR: { symbol?: { contains: string }; name?: { contains: string; mode: 'insensitive' } }[];
    } = {
      isActive: true,
      OR: [
        { symbol: { contains: query.toUpperCase() } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    };
    if (category && category !== 'ALL') where.category = category as AssetCategory;

    return this.prisma.asset.findMany({
      where,
      take: 50,
      orderBy: [{ isFeatured: 'desc' }, { symbol: 'asc' }],
    });
  }
}
