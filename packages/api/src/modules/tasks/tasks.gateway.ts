import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'tasks',
  cors: { origin: '*' },
})
export class TaskProgressGateway {
  private readonly logger = new Logger(TaskProgressGateway.name);

  @WebSocketServer()
  server: any;

  @OnGatewayConnection()
  handleConnection(client: any, args: any) {
    const { taskId } = args.handshake.headers['x-task-id'];
    const { userId } = args.handshake.headers['x-user-id'];

    if (taskId && userId) {
      client.taskId = taskId;
      client.userId = userId;
      client.join(`task:${taskId}`);

      this.logger.log(`✅ WebSocket connected for task: ${taskId} (user: ${userId})`);
    }
  }

  @OnGatewayDisconnect()
  handleDisconnect(client: any) {
    if (client.taskId) {
      client.leave(`task:${client.taskId}`);
      this.logger.log(`🔌 WebSocket disconnected from task: ${client.taskId}`);
    }
  }

  @SubscribeMessage('subscribe')
  handleMessage(client: any, payload: { taskId: string; }) {
    if (payload.taskId) {
      client.taskId = payload.taskId;
      client.join(`task:${payload.taskId}`);

      this.logger.log(`👥 Subscribed client to task: ${payload.taskId}`);

      client.send(JSON.stringify({
        type: 'subscribed',
        taskId: payload.taskId,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: any) {
    client.send(JSON.stringify({
      type: 'pong',
      timestamp: new Date().toISOString(),
    }));
  }

  // Helper method to broadcast to all clients in a task room
  broadcastToTask(taskId: string, message: any): void {
    this.server.to(`task:${taskId}`).emit('update', message);
  }

  // Helper method to get connected clients for a task
  getClientsForTask(taskId: string): any[] {
    const room = this.server?.of('/tasks').adapter.rooms[`task:${taskId}`];
    return room ? Array.from(room) : [];
  }

  // Helper method to get total connected clients
  getConnectedClientsCount(): number {
    return this.server?.getClientCount() || 0;
  }
}
