import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ChatsModule } from './chats/chats.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { GatewayModule } from './gateway/gateway.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ChatsModule,
    MessagesModule,
    GatewayModule,
  ],
})
export class AppModule {}
