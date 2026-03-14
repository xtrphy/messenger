import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUserId: string) {
    return this.prisma.user.findMany({
      where: { id: { not: currentUserId } },
      select: { id: true, email: true, createdAt: true },
      orderBy: { email: 'asc' },
    });
  }

  async search(query: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        email: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, email: true, createdAt: true },
      orderBy: { email: 'asc' },
      take: 20,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true },
    });
  }
}
