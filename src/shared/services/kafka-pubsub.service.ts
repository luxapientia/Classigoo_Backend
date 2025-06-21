import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { EventPayload, EventTypes } from '../../common/interfaces/events.interface';

@Injectable()
export class KafkaPubSubService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private listeners: Map<string, Set<(payload: EventPayload) => void>> = new Map();
  private isConsumerRunning: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'pubsub-service',
      brokers: ['localhost:9092'],
    });
    this.consumer = this.kafka.consumer({ groupId: 'pubsub-group' });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.producer.connect();

    // ✅ Subscribe to all predefined topics BEFORE running
    for (const topic of Object.values(EventTypes)) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    if (!this.isConsumerRunning) {
      await this.consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          const value = message.value?.toString();
          if (value) {
            const payload: EventPayload = JSON.parse(value);
            this.listeners.get(topic)?.forEach(cb => cb(payload));
          }
        },
      });
      this.isConsumerRunning = true;
    }

  }

  async publish<T>(event: string, data: T) {
    const payload: EventPayload<T> = {
      eventType: event,
      data,
      timestamp: Date.now(),
    };

    console.log("publishing event", event, payload);

    await this.producer.send({
      topic: event,
      messages: [{ value: JSON.stringify(payload) }],
    });
  }

  async subscribe(event: string, callback: (payload: EventPayload) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  async unsubscribe(event: string, callback: (payload: EventPayload) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }
}

