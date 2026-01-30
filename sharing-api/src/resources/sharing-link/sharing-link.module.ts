import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SharingLinkService } from './sharing-link.service';
import { SharingLinkController } from './sharing-link.controller';
import { InvitationExpirationProcessor } from './queue/invitation-expiration.processor';
import { SharingLinkExpirationProcessor } from './queue/sharing-link-expiration.processor';
import { SharingLinkQueuesService } from './queue/sharing-link.queues.service';
import { INVITATION_EXPIRATION_QUEUE, SHARING_LINK_EXPIRATION_QUEUE } from './queue/sharing-link.queue.constants';
import { SharingLinkRepository } from './sharing-link.repository';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: INVITATION_EXPIRATION_QUEUE },
      { name: SHARING_LINK_EXPIRATION_QUEUE },
    ),
  ],
  controllers: [SharingLinkController],
  providers: [
    SharingLinkService,
    SharingLinkRepository,
    SharingLinkQueuesService,
    InvitationExpirationProcessor,
    SharingLinkExpirationProcessor,
  ],
})
export class SharingLinkModule {}
