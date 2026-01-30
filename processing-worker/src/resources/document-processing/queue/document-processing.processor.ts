import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DocumentProcessingService } from '../document-processing.service';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.queue.constants';
import type { ProcessDocumentJobData } from './document-processing.queue.service';

@Processor(DOCUMENT_PROCESSING_QUEUE)
export class DocumentProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingProcessor.name);

  constructor(private readonly documentProcessingService: DocumentProcessingService) {
    super();
  }

  // BullMQ (@nestjs/bullmq) : implémenter `process()` au lieu de `@Process()`
  async process(job: Job<ProcessDocumentJobData>): Promise<void> {
    const documentId = job.data.dto?.document_id;
    this.logger.log(`Début job id=${job.id} document_id=${documentId ?? '-'} attempt=${job.attemptsMade + 1}`);

    try {
      await this.documentProcessingService.processDocument(job.data.dto);
    } catch (e) {
      const err = e as any;
      const message = err?.message ?? String(e);
      const stack = err?.stack ? `\n${err.stack}` : '';
      const kafka = job.data.kafka
        ? ` topic=${job.data.kafka.topic} partition=${job.data.kafka.partition} offset=${job.data.kafka.offset} key=${job.data.kafka.key ?? '-'}`
        : '';

      this.logger.error(
        `Échec job id=${job.id} document_id=${documentId ?? '-'} attempt=${job.attemptsMade + 1}${kafka}: ${message}${stack}`,
      );

      // Si c'était la dernière tentative, on marque le document en FAILED pour éviter les "PROCESSING" bloqués.
      const maxAttempts = Number(job.opts.attempts ?? 1);
      const currentAttempt = job.attemptsMade + 1;
      if (documentId && currentAttempt >= maxAttempts) {
        await this.documentProcessingService.markDocumentFailed(documentId, e);
      }
      throw e; // important: laisser BullMQ gérer retry/backoff
    }

    this.logger.log(`Fin job OK id=${job.id} document_id=${documentId ?? '-'}`);
  }
}

