import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { MessagesModule } from '../messages/messages.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [MessagesModule, AuthModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
