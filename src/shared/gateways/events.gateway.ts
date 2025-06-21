import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PubSubService } from '../services/pubsub.service';
import { EventPayload, EventTypes } from '../../common/interfaces/events.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
  pingInterval: 10000,
  pingTimeout: 20000,
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientRooms: Map<string, Set<string>> = new Map();

  // NEW: Track callbacks to unsubscribe later
  private clientCallbacks: Map<string, Map<string, (payload: EventPayload) => void>> = new Map();

  constructor(private readonly pubSubService: PubSubService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    console.log('client connected', client.id);
    this.clientRooms.set(client.id, new Set());
    this.clientCallbacks.set(client.id, new Map());

    for (const eventType of Object.values(EventTypes)) {
      const callback = (payload: EventPayload) => {
        const rooms = this.clientRooms.get(client.id) || new Set();
        if (this.shouldReceiveEvent(payload, Array.from(rooms))) {
          client.emit(eventType, payload);
        }
      };

      // Save the callback for future cleanup
      try {
        await this.pubSubService.subscribe(eventType, callback);
        this.clientCallbacks.get(client.id)?.set(eventType, callback);
      } catch (err) {
        console.error(`Failed to subscribe to ${eventType} for ${client.id}`, err);
      }
    }
  }

  async handleDisconnect(client: Socket) {
    console.log('client disconnected', client.id);

    this.clientRooms.delete(client.id);

    const callbacks = this.clientCallbacks.get(client.id);
    // if (callbacks) {
    //   for (const [eventType, callback] of callbacks.entries()) {
    //     await this.pubSubService.unsubscribe(eventType, callback);
    //   }
    // }

    if (callbacks) {
      await Promise.all(
        Array.from(callbacks.entries()).map(([eventType, callback]) =>
          this.pubSubService.unsubscribe(eventType, callback),
        )
      );
    }

    this.clientCallbacks.delete(client.id);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, room: string) {
    if (!this.clientRooms.has(client.id)) {
      this.clientRooms.set(client.id, new Set());
    }
    this.clientRooms.get(client.id)?.add(room);
    await client.join(room);
    return { event: 'joinRoom', data: { room, success: true } };
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, room: string) {
    const rooms = this.clientRooms.get(client.id);
    if (rooms) {
      rooms.delete(room);
    }
    await client.leave(room);
    return { event: 'leaveRoom', data: { room, success: true } };
  }

  private shouldReceiveEvent(payload: EventPayload, clientRooms: string[]): boolean {
    // Add real filtering logic here as needed
    return true;
  }
}
