import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SharingLinkService } from '../sharing-link.service';
import { INVITATION_EXPIRATION_QUEUE } from './sharing-link.queue.constants';
import type { InvitationExpirationJobData } from './sharing-link.queues.service';

@Processor(INVITATION_EXPIRATION_QUEUE)
export class InvitationExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(InvitationExpirationProcessor.name);

  constructor(private readonly sharingLinkService: SharingLinkService) {
    super();
  }

  async process(job: Job<InvitationExpirationJobData>): Promise<void> {
    const sharingLinkId = job.data.sharingLinkId;
    this.logger.log(`Début job invitation expiration id=${job.id} sharing_link_id=${sharingLinkId}`);
    await this.sharingLinkService.expireInvitationIfStillPending(sharingLinkId);
    this.logger.log(`Fin job invitation expiration OK id=${job.id} sharing_link_id=${sharingLinkId}`);
  }
}

