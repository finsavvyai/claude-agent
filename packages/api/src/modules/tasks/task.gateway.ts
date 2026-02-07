import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway as WSGateway,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WSGateway({
  namespace: 'tasks',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
})
export class TaskGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TaskGateway.name);
  private readonly connectedClients = new Map<string, { userId: string; socketId: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('🔌 Task WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate WebSocket connection
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`❌ Unauthorized connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.secret'),
      });

      this.connectedClients.set(client.id, {
        userId: payload.sub,
        socketId: client.id,
      });

      this.logger.log(`✅ Client connected: ${client.id} (User: ${payload.sub})`);

      // Join user to their personal room
      client.join(`user:${payload.sub}`);

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to task updates',
        userId: payload.sub,
        socketId: client.id,
      });

    } catch (error) {
      this.logger.error(`❌ WebSocket authentication failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);

    if (clientInfo) {
      this.logger.log(`❌ Client disconnected: ${client.id} (User: ${clientInfo.userId})`);
      this.connectedClients.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe:task')
  async subscribeToTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { taskId } = data;

      // Validate taskId format
      if (!taskId || typeof taskId !== 'string') {
        client.emit('error', { message: 'Invalid taskId provided' });
        return;
      }

      // Join task-specific room
      client.join(`task:${taskId}`);

      this.logger.log(`👂 Client ${client.id} subscribed to task ${taskId}`);

      client.emit('subscribed', {
        taskId,
        message: `Subscribed to task ${taskId} updates`,
      });

    } catch (error) {
      this.logger.error(`Error subscribing to task: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to task' });
    }
  }

  @SubscribeMessage('unsubscribe:task')
  async unsubscribeFromTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { taskId } = data;

      // Leave task-specific room
      client.leave(`task:${taskId}`);

      this.logger.log(`🔇 Client ${client.id} unsubscribed from task ${taskId}`);

      client.emit('unsubscribed', {
        taskId,
        message: `Unsubscribed from task ${taskId} updates`,
      });

    } catch (error) {
      this.logger.error(`Error unsubscribing from task: ${error.message}`);
      client.emit('error', { message: 'Failed to unsubscribe from task' });
    }
  }

  @SubscribeMessage('subscribe:queue')
  async subscribeToQueue(@ConnectedSocket() client: Socket) {
    try {
      // Join queue updates room
      client.join('queue:updates');

      this.logger.log(`👂 Client ${client.id} subscribed to queue updates`);

      client.emit('subscribed', {
        type: 'queue',
        message: 'Subscribed to queue updates',
      });

    } catch (error) {
      this.logger.error(`Error subscribing to queue: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to queue updates' });
    }
  }

  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      socketId: client.id,
    });
  }

  // Methods to broadcast updates (called by TasksService)
  broadcastTaskProgress(taskId: string, progress: any) {
    this.server.to(`task:${taskId}`).emit('task:progress', {
      taskId,
      progress,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`📢 Broadcast progress for task ${taskId}`);
  }

  broadcastTaskUpdate(taskId: string, update: any) {
    this.server.to(`task:${taskId}`).emit('task:update', {
      taskId,
      update,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`📢 Broadcast update for task ${taskId}`);
  }

  broadcastTaskCompleted(taskId: string, result: any) {
    this.server.to(`task:${taskId}`).emit('task:completed', {
      taskId,
      result,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`📢 Broadcast completion for task ${taskId}`);
  }

  broadcastTaskFailed(taskId: string, error: any) {
    this.server.to(`task:${taskId}`).emit('task:failed', {
      taskId,
      error,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`📢 Broadcast failure for task ${taskId}`);
  }

  broadcastQueueUpdate(update: any) {
    this.server.to('queue:updates').emit('queue:update', {
      update,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug('📢 Broadcast queue update');
  }

  broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`📢 Broadcast to user ${userId}: ${event}`);
  }

  // Helper methods for connection management
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getUserConnections(userId: string): string[] {
    const connections: string[] = [];

    this.connectedClients.forEach((clientInfo, socketId) => {
      if (clientInfo.userId === userId) {
        connections.push(socketId);
      }
    });

    return connections;
  }

  isUserConnected(userId: string): boolean {
    return this.getUserConnections(userId).length > 0;
  }
}
