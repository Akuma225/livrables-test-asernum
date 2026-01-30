import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Consumer, EachMessagePayload } from 'kafkajs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProcessDocumentDto } from 'src/resources/document-processing/dto/process-document.dto';
import { DocumentProcessingQueueService } from 'src/resources/document-processing/queue/document-processing.queue.service';
import { createKafkaClient } from './kafka.config';
import { KAFKA_TOPICS } from './topics';

function parseBool(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

function resolveTopics(): string[] {
  return Object.values(KAFKA_TOPICS);
}

function normalizePayload(payload: any): any {
  // Supporte { documentId } venant d'autres services
  if (payload && typeof payload === 'object') {
    if (payload.documentId && !payload.document_id) {
      payload.document_id = payload.documentId;
    }
  }
  return payload;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer: Consumer | null = null;
  private isRunning = false;

  constructor(private readonly documentProcessingQueue: DocumentProcessingQueueService) {}

  async onModuleInit(): Promise<void> {
    const kafka = createKafkaClient();
    const groupId = process.env.KAFKA_GROUP_ID;
    if (!groupId) {
      throw new Error("Variable d'environnement manquante: KAFKA_GROUP_ID");
    }
    const fromBeginning = parseBool(process.env.KAFKA_FROM_BEGINNING, false);

    const topics = resolveTopics();
    if (!topics.length) {
      throw new Error('Aucun topic défini dans `topics.ts`.');
    }

    this.consumer = kafka.consumer({
      groupId,
      sessionTimeout: Number(process.env.KAFKA_SESSION_TIMEOUT_MS || 30_000),
      heartbeatInterval: Number(process.env.KAFKA_HEARTBEAT_INTERVAL_MS || 3_000),
    });

    await this.consumer.connect();

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning });
    }

    this.isRunning = true;
    this.logger.log(`Consumer Kafka connecté (groupId=${groupId}) et abonné: ${topics.join(', ')}`);

    await this.consumer.run({
      autoCommit: false,
      partitionsConsumedConcurrently: Number(process.env.KAFKA_CONCURRENCY || 1),
      eachMessage: async (payload) => this.handleMessage(payload),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  private async stop(): Promise<void> {
    if (!this.consumer) return;
    if (!this.isRunning) {
      try {
        await this.consumer.disconnect();
      } finally {
        this.consumer = null;
      }
      return;
    }

    this.isRunning = false;
    try {
      await this.consumer.stop();
    } catch (e) {
      this.logger.warn(`Erreur consumer.stop(): ${(e as Error).message}`);
    }
    try {
      await this.consumer.disconnect();
    } catch (e) {
      this.logger.warn(`Erreur consumer.disconnect(): ${(e as Error).message}`);
    } finally {
      this.consumer = null;
      this.logger.log('Consumer Kafka arrêté.');
    }
  }

  private async commit(topic: string, partition: number, offset: string): Promise<void> {
    if (!this.consumer) return;
    await this.consumer.commitOffsets([
      { topic, partition, offset: (BigInt(offset) + 1n).toString() },
    ]);
  }

  private async handleMessage({
    topic,
    partition,
    message,
    heartbeat,
  }: EachMessagePayload): Promise<void> {
    if (!this.consumer) return;

    const key = message.key?.toString('utf8');
    const value = message.value?.toString('utf8') ?? '';
    const offset = message.offset;

    if (!value) {
      this.logger.warn(`[${topic}] message vide (key=${key ?? '-'}) offset=${offset}`);
      await this.commit(topic, partition, offset);
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(value);
      parsed = normalizePayload(parsed);
    } catch {
      this.logger.error(`[${topic}] JSON invalide (key=${key ?? '-'}) offset=${offset}`);
      if (parseBool(process.env.KAFKA_SKIP_INVALID, false)) {
        await this.commit(topic, partition, offset);
        this.logger.warn(`[${topic}] message invalide skippé (commit) offset=${offset}`);
        return;
      }
      throw new Error('Kafka message JSON invalid');
    }

    // Router par topic => un handler par topic
    switch (topic) {
      case KAFKA_TOPICS.DOCUMENT_UPLOADED: {
        const dto = plainToInstance(ProcessDocumentDto, parsed);
        const errors = await validate(dto, {
          whitelist: true,
          forbidNonWhitelisted: false,
          validationError: { target: false },
        });

        if (errors.length) {
          this.logger.error(
            `[${topic}] payload invalide (key=${key ?? '-'}) offset=${offset}: ${JSON.stringify(errors)}`,
          );
          if (parseBool(process.env.KAFKA_SKIP_INVALID, false)) {
            await this.commit(topic, partition, offset);
            this.logger.warn(`[${topic}] message invalide skippé (commit) offset=${offset}`);
            return;
          }
          throw new Error('Kafka message validation failed');
        }

        this.logger.log(
          `[${topic}] reçu (key=${key ?? '-'}) partition=${partition} offset=${offset} document_id=${dto.document_id}`,
        );

        // Enqueue BullMQ (Redis) puis commit Kafka. Le traitement réel se fait côté worker BullMQ.
        await heartbeat();
        await this.documentProcessingQueue.enqueueProcessDocument(dto, {
          topic,
          partition,
          offset,
          key: key ?? undefined,
        });
        await heartbeat();

        await this.commit(topic, partition, offset);
        this.logger.log(`[${topic}] enqueued OK (key=${key ?? '-'}) partition=${partition} offset=${offset}`);

        return;
      }

      default: {
        // Si on s'abonne à un topic sans handler, mieux vaut ne pas commit (sinon perte)
        this.logger.error(`[${topic}] aucun handler configuré (key=${key ?? '-'}) offset=${offset}`);
        throw new Error(`No handler for topic ${topic}`);
      }
    }
  }
}

