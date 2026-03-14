import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrGet(currentUserId: string, dto: CreateChatDto) {
    if (dto.participantId === currentUserId) {
      throw new BadRequestException('Cannot create chat with yourself');
    }

    const participant = await this.prisma.user.findUnique({
      where: { id: dto.participantId },
    });
    if (!participant) {
      throw new NotFoundException('User not found');
    }

    // Check if a direct chat already exists between these two users
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: dto.participantId } } },
        ],
      },
      include: {
        participants: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (existingChat) {
      return existingChat;
    }

    return this.prisma.chat.create({
      data: {
        participants: {
          create: [
            { userId: currentUserId },
            { userId: dto.participantId },
          ],
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });
  }

  async getUserChats(currentUserId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: { some: { userId: currentUserId } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, email: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Add unread count for each chat
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: currentUserId },
            isRead: false,
          },
        });

        return {
          id: chat.id,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          participants: chat.participants,
          lastMessage: chat.messages[0] || null,
          unreadCount,
        };
      }),
    );

    return chatsWithUnread;
  }

  async getChatById(chatId: string, currentUserId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: { some: { userId: currentUserId } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }
}
