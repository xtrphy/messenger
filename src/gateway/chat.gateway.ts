import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { MessagesService } from '../messages/messages.service.js';
import { MessageType } from '../../generated/prisma/client.js';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId -> Set of socket IDs
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.userEmail = user.email;

      // Track online status
      if (!this.onlineUsers.has(user.id)) {
        this.onlineUsers.set(user.id, new Set());
      }
      this.onlineUsers.get(user.id)!.add(client.id);

      // Broadcast online status
      this.server.emit('user:online', { userId: user.id });

      // Send current online users list to the newly connected client
      const onlineUserIds = Array.from(this.onlineUsers.keys());
      client.emit('users:online', onlineUserIds);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const sockets = this.onlineUsers.get(client.userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.onlineUsers.delete(client.userId);
        this.server.emit('user:offline', { userId: client.userId });
      }
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    // Verify the user is a participant
    const participant = await this.prisma.chatParticipant.findFirst({
      where: { chatId: data.chatId, userId: client.userId },
    });

    if (!participant) {
      client.emit('error', { message: 'Not a member of this chat' });
      return;
    }

    client.join(`chat:${data.chatId}`);
    client.emit('chat:joined', { chatId: data.chatId });
  }

  @SubscribeMessage('chat:leave')
  handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    client.leave(`chat:${data.chatId}`);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      chatId: string;
      type: MessageType;
      text?: string;
      mediaUrl?: string;
    },
  ) {
    try {
      const message = await this.messagesService.create(client.userId, {
        chatId: data.chatId,
        type: data.type,
        text: data.text,
        mediaUrl: data.mediaUrl,
      });

      // Emit to all users in the chat room
      this.server.to(`chat:${data.chatId}`).emit('message:new', message);

      // Also notify participants not in the room (for chat list updates)
      const participants = await this.prisma.chatParticipant.findMany({
        where: { chatId: data.chatId },
      });

      for (const p of participants) {
        if (p.userId !== client.userId) {
          // Send to all sockets of this user
          const userSockets = this.onlineUsers.get(p.userId);
          if (userSockets) {
            for (const socketId of userSockets) {
              this.server.to(socketId).emit('chat:updated', {
                chatId: data.chatId,
                lastMessage: message,
              });
            }
          }
        }
      }
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    try {
      await this.messagesService.markAsRead(data.chatId, client.userId);

      // Notify all users in the chat room that messages were read
      this.server.to(`chat:${data.chatId}`).emit('message:read', {
        chatId: data.chatId,
        readByUserId: client.userId,
      });
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    client.to(`chat:${data.chatId}`).emit('message:typing', {
      chatId: data.chatId,
      userId: client.userId,
      email: client.userEmail,
    });
  }

  @SubscribeMessage('message:stopTyping')
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    client.to(`chat:${data.chatId}`).emit('message:stopTyping', {
      chatId: data.chatId,
      userId: client.userId,
    });
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers.keys());
  }
}
