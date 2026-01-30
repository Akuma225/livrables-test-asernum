import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SharingLinkService } from '../sharing-link.service';
import { SHARING_LINK_EXPIRATION_QUEUE } from './sharing-link.queue.constants';
import type { SharingLinkExpirationJobData } from './sharing-link.queues.service';

@Processor(SHARING_LINK_EXPIRATION_QUEUE)
export class SharingLinkExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(SharingLinkExpirationProcessor.name);

  constructor(private readonly sharingLinkService: SharingLinkService) {
    super();
  }

  async process(job: Job<SharingLinkExpirationJobData>): Promise<void> {
    const sharingLinkId = job.data.sharingLinkId;
    this.logger.log(`Début job sharing link expiration id=${job.id} sharing_link_id=${sharingLinkId}`);
    await this.sharingLinkService.expireSharingLinkIfDue(sharingLinkId);
    this.logger.log(`Fin job sharing link expiration OK id=${job.id} sharing_link_id=${sharingLinkId}`);
  }
}

