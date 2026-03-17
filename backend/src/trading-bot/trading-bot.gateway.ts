import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SignalEngineService } from './services/signal-engine.service';
import { AssetClass } from './interfaces/signal.interface';

/**
 * Bot-specific WebSocket gateway running on the same Socket.IO server as the
 * market-data gateway (shared namespace '/').
 * Bot events are prefixed with 'bot:' to avoid collisions.
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/',
  transports: ['polling', 'websocket'],
})
export class TradingBotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TradingBotGateway.name);

  // socketId → userId (populated when client emits 'auth')
  private readonly userSockets = new Map<string, string>();
  // socketId → subscribed assets
  private readonly assetSubscriptions = new Map<string, Set<string>>();

  constructor(private readonly signalEngine: SignalEngineService) {}

  handleConnection(client: Socket) {
    this.assetSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.userSockets.delete(client.id);
    this.assetSubscriptions.delete(client.id);
  }

  // Client → Server events

  @SubscribeMessage('bot:subscribe:asset')
  handleSubscribeAsset(client: Socket, payload: { asset: string; assetClass?: AssetClass }) {
    const subs = this.assetSubscriptions.get(client.id) ?? new Set();
    subs.add(payload.asset);
    this.assetSubscriptions.set(client.id, subs);
    client.join(`bot:asset:${payload.asset}`);
    this.logger.debug(`Client ${client.id} subscribed to bot updates for ${payload.asset}`);
  }

  @SubscribeMessage('bot:unsubscribe:asset')
  handleUnsubscribeAsset(client: Socket, asset: string) {
    const subs = this.assetSubscriptions.get(client.id);
    subs?.delete(asset);
    client.leave(`bot:asset:${asset}`);
  }

  @SubscribeMessage('bot:trigger:analysis')
  async handleTriggerAnalysis(
    client: Socket,
    payload: { asset: string; assetClass: AssetClass; timeframe?: string },
  ) {
    const userId = this.userSockets.get(client.id);
    if (!userId) {
      client.emit('bot:error', { message: 'Not authenticated — send auth event first' });
      return;
    }
    try {
      client.emit('bot:analysis:loading', { asset: payload.asset });
      const signal = await this.signalEngine.generateSignal(
        userId,
        payload.asset,
        payload.assetClass,
        payload.timeframe ?? '1h',
      );
      client.emit('bot:signal:new', signal);
    } catch (err) {
      client.emit('bot:error', { message: (err as Error).message });
    }
  }

  // Server → Client broadcast methods (called by services)

  emitSignalToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  broadcastSignalToAssetSubscribers(asset: string, event: string, data: unknown): void {
    this.server.to(`bot:asset:${asset}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  emitBotStatus(status: { active: boolean; message: string }): void {
    this.server.emit('bot:status', status);
  }
}
