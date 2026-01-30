import { Injectable } from '@nestjs/common';
import { Prisma, SharingMode, SharingStatus } from '../../../generated/prisma/client';
import { prisma } from 'src/libs/prisma/prisma';

export const sharingLinkDefaultInclude: Prisma.sharing_linksInclude = {
  owner: true,
  recipient: true,
  sharing_link_histories: true,
  sharing_items: true,
};

@Injectable()
export class SharingLinkRepository {
  findById(id: string, include: Prisma.sharing_linksInclude = sharingLinkDefaultInclude) {
    return prisma.sharing_links.findUnique({
      where: { id },
      include,
    });
  }

  findByToken(token: string, include: Prisma.sharing_linksInclude = sharingLinkDefaultInclude) {
    return prisma.sharing_links.findUnique({
      where: { token },
      include,
    });
  }

  create(data: Prisma.sharing_linksCreateInput) {
    return prisma.sharing_links.create({ data });
  }

  update(id: string, data: Prisma.sharing_linksUpdateInput) {
    return prisma.sharing_links.update({ where: { id }, data });
  }

  createItemsMany(sharingLinkId: string, items: { document_id?: string; folder_id?: string }[]) {
    const payload: Prisma.sharing_itemsCreateManyInput[] = items.map(item => ({
      sharing_link_id: sharingLinkId,
      document_id: item.document_id,
      folder_id: item.folder_id,
    }));

    return prisma.sharing_items.createMany({ data: payload });
  }

  async setStatusWithHistory(params: {
    sharingLinkId: string;
    previousStatus: SharingStatus;
    newStatus: SharingStatus;
    reason?: string;
    createdBy?: string;
  }) {
    const { sharingLinkId, previousStatus, newStatus, reason, createdBy } = params;

    return prisma.$transaction([
      prisma.sharing_links.update({
        where: { id: sharingLinkId },
        data: {
          status: newStatus,
          status_reason: reason,
          status_last_changed_at: new Date(),
        },
      }),
      prisma.sharing_link_histories.create({
        data: {
          sharing_link_id: sharingLinkId,
          previous_status: previousStatus,
          new_status: newStatus,
          reason: reason,
          created_by: createdBy,
        },
      }),
    ]);
  }

  getForInvitationExpiration(sharingLinkId: string) {
    return prisma.sharing_links.findUnique({
      where: { id: sharingLinkId },
      select: {
        id: true,
        status: true,
        mode: true,
        recipient_id: true,
        deleted_at: true,
      },
    });
  }

  getForSharingLinkExpiration(sharingLinkId: string) {
    return prisma.sharing_links.findUnique({
      where: { id: sharingLinkId },
      select: {
        id: true,
        status: true,
        expires_at: true,
        deleted_at: true,
      },
    });
  }

  getOwnedFolderIds(folderIds: string[], ownerId: string) {
    return prisma.folders.findMany({
      where: {
        id: { in: folderIds },
        user_id: ownerId,
        deleted_at: null,
      },
      select: { id: true },
    });
  }

  getOwnedDocumentIds(documentIds: string[], ownerId: string) {
    return prisma.documents.findMany({
      where: {
        id: { in: documentIds },
        folder: {
          user_id: ownerId,
        },
      },
      select: {
        id: true,
        upload_status: true,
        deleted_at: true,
        folder: { select: { deleted_at: true } },
      },
    });
  }

  isPrivatePendingInvitation(sharingLink: {
    mode: SharingMode;
    status: SharingStatus;
    recipient_id: string | null;
    deleted_at: Date | null;
  }): boolean {
    if (sharingLink.deleted_at) return false;
    if (sharingLink.mode !== SharingMode.PRIVATE) return false;
    if (!sharingLink.recipient_id) return false;
    return sharingLink.status === SharingStatus.PENDING;
  }
}

