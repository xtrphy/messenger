import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, AuthUser } from '../auth/user.decorator.js';
import { CreateChatDto } from './dto/create-chat.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChatDto) {
    return this.chatsService.createOrGet(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.chatsService.getUserChats(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.chatsService.getChatById(id, user.id);
  }
}
