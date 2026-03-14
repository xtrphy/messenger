import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, AuthUser } from '../auth/user.decorator.js';
import { CreateMessageDto } from './dto/create-message.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMessageDto) {
    return this.messagesService.create(user.id, dto);
  }

  @Get(':chatId')
  getMessages(
    @Param('chatId') chatId: string,
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getChatMessages(
      chatId,
      user.id,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Patch(':chatId/read')
  markAsRead(
    @Param('chatId') chatId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.markAsRead(chatId, user.id);
  }
}
