import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { extractTokenFromHandshake } from './handshake-auth.util';
import { DEVICE_METRICS_UPDATED_EVENT, deviceRoom } from './realtime.events';
import type { DeviceMetricsUpdatedEvent } from './realtime.events';

interface SubscribePayload {
  deviceId: string;
}

@WebSocketGateway({
  namespace: 'realtime',
  cors: { credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = extractTokenFromHandshake(client.handshake.headers.cookie);

    if (!token) {
      this.logger.debug(`Rejecting socket ${client.id}: no auth cookie`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('jwt', { infer: true }).secret,
      });
      client.data.userId = payload.sub;
    } catch {
      this.logger.debug(`Rejecting socket ${client.id}: invalid/expired token`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('device:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): void {
    if (!payload?.deviceId) return;
    void client.join(deviceRoom(payload.deviceId));
  }

  @SubscribeMessage('device:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): void {
    if (!payload?.deviceId) return;
    void client.leave(deviceRoom(payload.deviceId));
  }

  @OnEvent(DEVICE_METRICS_UPDATED_EVENT)
  handleDeviceMetricsUpdated(event: DeviceMetricsUpdatedEvent): void {
    this.server.to(deviceRoom(event.deviceId)).emit('device:metrics', event);
  }
}
