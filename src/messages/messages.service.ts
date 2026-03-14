import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { MessageType } from '../../generated/prisma/client.js';

const MAX_MEDIA_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(senderId: string, dto: CreateMessageDto) {
    // Verify the user is a participant of the chat
    const participant = await this.prisma.chatParticipant.findFirst({
      where: { chatId: dto.chatId, userId: senderId },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    // Validate content based on type
    if (dto.type === MessageType.TEXT && !dto.text) {
      throw new BadRequestException('Text messages must have text content');
    }
    if (
      ([MessageType.IMAGE, MessageType.VIDEO, MessageType.STICKER] as MessageType[]).includes(dto.type) &&
      !dto.mediaUrl
    ) {
      throw new BadRequestException('Media messages must have a media URL');
    }

    const message = await this.prisma.message.create({
      data: {
        chatId: dto.chatId,
        senderId,
        type: dto.type,
        text: dto.text,
        mediaUrl: dto.mediaUrl,
      },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });

    // Update chat's updatedAt so it sorts to top
    await this.prisma.chat.update({
      where: { id: dto.chatId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getChatMessages(
    chatId: string,
    currentUserId: string,
    cursor?: string,
    limit = 50,
  ) {
    // Verify membership
    const participant = await this.prisma.chatParticipant.findFirst({
      where: { chatId, userId: currentUserId },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {}),
    });

    return messages.reverse();
  }

  async markAsRead(chatId: string, currentUserId: string) {
    // Verify membership
    const participant = await this.prisma.chatParticipant.findFirst({
      where: { chatId, userId: currentUserId },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    await this.prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: currentUserId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }
}
