import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaPubSubService } from './kafka-pubsub.service';
import { EventPayload } from '../../common/interfaces/events.interface';

@Injectable()
export class PubSubService implements OnModuleInit, OnModuleDestroy {
  private subscribers = new Map<string, Set<(payload: EventPayload) => void>>();
  private readonly isProd: boolean;

  constructor(
    private configService: ConfigService,
    private readonly kafkaPubSubService: KafkaPubSubService,
  ) {
    this.isProd = configService.get<string>('env.node_env') === 'production';
  }

  async onModuleInit() {
    if (this.isProd) {
      await this.kafkaPubSubService.onModuleInit();
    }
  }

  async onModuleDestroy() {
    if (this.isProd) {
      await this.kafkaPubSubService.onModuleDestroy();
    }
    this.subscribers.clear();
  }

  async publish<T>(event: string, data: T): Promise<void> {
    if (this.isProd) {
      return this.kafkaPubSubService.publish(event, data);
    }

    const payload: EventPayload<T> = {
      eventType: event,
      data,
      timestamp: Date.now(),
    };
    this.subscribers.get(event)?.forEach(cb => cb(payload));
  }

  async subscribe(event: string, callback: (payload: EventPayload) => void): Promise<void> {
    if (this.isProd) {
      return this.kafkaPubSubService.subscribe(event, callback);
    }

    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)?.add(callback);
  }

  async unsubscribe(event: string, callback: (payload: EventPayload) => void): Promise<void> {
    if (this.isProd) {
      return this.kafkaPubSubService.unsubscribe(event, callback);
    }

    this.subscribers.get(event)?.delete(callback);
  }
}
