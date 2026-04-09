import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MarketDataService } from './market-data.service';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()),
    credentials: true,
  },
  namespace: '/',
  transports: ['polling', 'websocket'],
})
export class MarketDataGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;

  private clientSubscriptions: Map<string, (() => void)[]> = new Map();
  private clientUserMap: Map<string, string> = new Map(); // socketId -> userId

  constructor(
    private marketDataService: MarketDataService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit() {}

  handleConnection(client: Socket) {
    const prices = this.marketDataService.getAllPrices();
    client.emit('prices:all', prices);

    const unsub = this.marketDataService.subscribe('ALL', (data) => {
      client.emit('price:update', data);
    });

    const existing = this.clientSubscriptions.get(client.id) || [];
    existing.push(unsub);
    this.clientSubscriptions.set(client.id, existing);
  }

  handleDisconnect(client: Socket) {
    const unsubs = this.clientSubscriptions.get(client.id) || [];
    unsubs.forEach(fn => fn());
    this.clientSubscriptions.delete(client.id);
    this.clientUserMap.delete(client.id);
  }

  @SubscribeMessage('auth')
  handleAuth(client: Socket, payload: { token: string }) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = this.jwtService.verify(payload.token, { secret }) as { sub: string };
      const userId = decoded.sub;
      this.clientUserMap.set(client.id, userId);
      client.join(`user:${userId}`);
    } catch {
      client.emit('auth:error', { message: 'Invalid or expired token' });
    }
  }

  @SubscribeMessage('subscribe:symbol')
  handleSubscribeSymbol(client: Socket, symbol: string) {
    const price = this.marketDataService.getPrice(symbol);
    if (price) client.emit('price:update', price);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
