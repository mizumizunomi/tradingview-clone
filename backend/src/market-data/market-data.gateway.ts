import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MarketDataService } from './market-data.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/',
  transports: ['polling', 'websocket'],
})
export class MarketDataGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;

  private clientSubscriptions: Map<string, (() => void)[]> = new Map();
  private clientUserMap: Map<string, string> = new Map(); // socketId -> userId

  constructor(private marketDataService: MarketDataService) {}

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
  handleAuth(client: Socket, userId: string) {
    this.clientUserMap.set(client.id, userId);
    client.join(`user:${userId}`);
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
