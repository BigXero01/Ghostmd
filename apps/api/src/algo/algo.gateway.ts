import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TelemetryService } from './telemetry.service';

@WebSocketGateway({
  namespace: '/algo',
  cors: { origin: '*', credentials: true },
})
export class AlgoGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private telemetry: TelemetryService,
  ) {}

  afterInit() {
    this.telemetry.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      const payload = this.jwtService.verify(token, { secret: this.config.get('JWT_SECRET') });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      client.emit('connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      client.leave(`user:${client.data.userId}`);
    }
  }

  @SubscribeMessage('subscribe_feed')
  handleSubscribeFeed(client: Socket) {
    client.join('algo_feed');
    return { subscribed: true };
  }
}
