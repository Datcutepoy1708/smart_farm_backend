import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface FarmOverviewUpdateData {
  barnId: number;
  temperature: number;
  humidity: number;
  recordedAt: string;
}

interface JoinFarmPayload {
  userId: number;
}

export interface AlertPayload {
  id: number;
  barnId: number;
  alertType: string;
  severity: string;
  message: string;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`🔗 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:farm')
  handleJoinFarm(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinFarmPayload,
  ) {
    const room = `farm_${data.userId}`;
    client.join(room);
    this.logger.log(`Client joined ${room}`);
    return { event: 'join:farm', data: { joined: room } };
  }

  @SubscribeMessage('leave:farm')
  handleLeaveFarm(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinFarmPayload,
  ) {
    const room = `farm_${data.userId}`;
    client.leave(room);
    this.logger.log(`Client left ${room}`);
    return { event: 'leave:farm', data: { left: room } };
  }

  /**
   * Emit real-time farm overview update tới room farm_{userId}
   * Gọi từ MqttService sau khi lưu environment_log
   */
  emitFarmOverviewUpdate(userId: number, data: FarmOverviewUpdateData) {
    const room = `farm_${userId}`;
    this.server.to(room).emit('farm:overview:update', data);
    this.logger.debug(
      `📡 Emitted farm:overview:update to ${room}: Barn${data.barnId} ${data.temperature}°C`,
    );
  }

  /**
   * Emit alert mới tới room farm_{userId}
   */
  emitNewAlert(userId: number, alert: AlertPayload) {
    const room = `farm_${userId}`;
    this.server.to(room).emit('alert:new', alert);
    this.logger.debug(
      `🔔 Emitted alert:new to ${room}: [${alert.severity}] ${alert.message}`,
    );
  }
}
