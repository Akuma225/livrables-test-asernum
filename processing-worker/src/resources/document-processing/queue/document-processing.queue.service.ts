import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { ProcessDocumentDto } from '../dto/process-document.dto';
import { DOCUMENT_PROCESSING_QUEUE, PROCESS_DOCUMENT_JOB } from './document-processing.queue.constants';

export type KafkaMeta = {
  topic: string;
  partition: number;
  offset: string;
  key?: string;
};

export type ProcessDocumentJobData = {
  dto: ProcessDocumentDto;
  kafka?: KafkaMeta;
};

@Injectable()
export class DocumentProcessingQueueService {
  private readonly logger = new Logger(DocumentProcessingQueueService.name);

  constructor(
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly queue: Queue<ProcessDocumentJobData>,
  ) {}

  /**
   * BullMQ interdit le caractère ':' dans les jobId (utilisé dans ses clés Redis).
   * On garde un jobId stable pour la déduplication (replay Kafka) mais on le rend "safe".
   */
  private toSafeJobId(raw: string): string {
    return raw.replace(/:/g, '_');
  }

  async enqueueProcessDocument(dto: ProcessDocumentDto, kafka?: KafkaMeta): Promise<Job<ProcessDocumentJobData> | null> {
    const attempts = Number(process.env.BULLMQ_ATTEMPTS ?? 3);
    const backoffMs = Number(process.env.BULLMQ_BACKOFF_MS ?? 5_000);

    // Déduplication "soft": en cas de replay Kafka (crash entre enqueue et commit),
    // on utilise un jobId stable basé sur topic/partition/offset.
    const jobId = kafka ? this.toSafeJobId(`kafka:${kafka.topic}:${kafka.partition}:${kafka.offset}`) : undefined;

    try {
      const job = await this.queue.add(
        PROCESS_DOCUMENT_JOB,
        { dto, kafka },
        {
          jobId,
          attempts,
          backoff: { type: 'exponential', delay: backoffMs },
          removeOnComplete: true,
          removeOnFail: Number(process.env.BULLMQ_REMOVE_ON_FAIL ?? 1000),
        },
      );

      this.logger.log(
        `Job enqueued name=${PROCESS_DOCUMENT_JOB} id=${job.id} document_id=${dto.document_id} kafka=${jobId ?? '-'}`,
      );
      return job;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);

      if (jobId && /already exists/i.test(msg)) {
        // Job déjà en file => on considère l'enqueue OK
        this.logger.warn(`Job déjà présent (jobId=${jobId}), on continue.`);
        const existingJob = await this.queue.getJob(jobId);
        return existingJob ?? null;
      }

      throw e;
    }
  }
}

