import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import {
  EXPIRE_INVITATION_JOB,
  EXPIRE_SHARING_LINK_JOB,
  INVITATION_EXPIRATION_QUEUE,
  SHARING_LINK_EXPIRATION_QUEUE,
} from './sharing-link.queue.constants';

export type InvitationExpirationJobData = {
  sharingLinkId: string;
};

export type SharingLinkExpirationJobData = {
  sharingLinkId: string;
};

@Injectable()
export class SharingLinkQueuesService {
  private readonly logger = new Logger(SharingLinkQueuesService.name);

  constructor(
    @InjectQueue(INVITATION_EXPIRATION_QUEUE)
    private readonly invitationExpirationQueue: Queue<InvitationExpirationJobData>,
    @InjectQueue(SHARING_LINK_EXPIRATION_QUEUE)
    private readonly sharingLinkExpirationQueue: Queue<SharingLinkExpirationJobData>,
  ) {}

  private invitationJobId(sharingLinkId: string): string {
    return `invitation_expire_${sharingLinkId}`;
  }

  private sharingLinkJobId(sharingLinkId: string): string {
    return `sharing_link_expire_${sharingLinkId}`;
  }

  async scheduleInvitationExpiration(sharingLinkId: string, delayMs: number): Promise<Job<InvitationExpirationJobData>> {
    const jobId = this.invitationJobId(sharingLinkId);
    const removeOnFail = Number(process.env.BULLMQ_REMOVE_ON_FAIL ?? 1000);

    try {
      const job = await this.invitationExpirationQueue.add(
        EXPIRE_INVITATION_JOB,
        { sharingLinkId },
        { jobId, delay: Math.max(0, delayMs), removeOnComplete: true, removeOnFail },
      );
      this.logger.log(`Job invitation expiration planifié id=${job.id} sharing_link_id=${sharingLinkId}`);
      return job;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      if (/already exists/i.test(msg)) {
        const existing = await this.invitationExpirationQueue.getJob(jobId);
        if (existing) return existing;
      }
      throw e;
    }
  }

  async cancelInvitationExpiration(sharingLinkId: string): Promise<void> {
    const jobId = this.invitationJobId(sharingLinkId);
    const job = await this.invitationExpirationQueue.getJob(jobId);
    if (!job) return;
    await job.remove();
    this.logger.log(`Job invitation expiration supprimé jobId=${jobId} sharing_link_id=${sharingLinkId}`);
  }

  async scheduleSharingLinkExpiration(sharingLinkId: string, runAt: Date): Promise<Job<SharingLinkExpirationJobData>> {
    const jobId = this.sharingLinkJobId(sharingLinkId);
    const removeOnFail = Number(process.env.BULLMQ_REMOVE_ON_FAIL ?? 1000);
    const delayMs = runAt.getTime() - Date.now();

    const existing = await this.sharingLinkExpirationQueue.getJob(jobId);
    if (existing) {
      await existing.remove();
    }

    const job = await this.sharingLinkExpirationQueue.add(
      EXPIRE_SHARING_LINK_JOB,
      { sharingLinkId },
      { jobId, delay: Math.max(0, delayMs), removeOnComplete: true, removeOnFail },
    );

    this.logger.log(`Job sharing link expiration planifié id=${job.id} sharing_link_id=${sharingLinkId} runAt=${runAt.toISOString()}`);
    return job;
  }

  async cancelSharingLinkExpiration(sharingLinkId: string): Promise<void> {
    const jobId = this.sharingLinkJobId(sharingLinkId);
    const job = await this.sharingLinkExpirationQueue.getJob(jobId);
    if (!job) return;
    await job.remove();
    this.logger.log(`Job sharing link expiration supprimé jobId=${jobId} sharing_link_id=${sharingLinkId}`);
  }
}

