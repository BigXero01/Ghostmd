import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class TelemetryService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }

  emitToAll(event: string, data: any) {
    if (this.server) {
      this.server.to('algo_feed').emit(event, data);
    }
  }

  broadcastTrade(trade: any) {
    this.emitToAll('trade_executed', trade);
  }

  broadcastSignal(signal: any) {
    this.emitToAll('signal_detected', signal);
  }
}
