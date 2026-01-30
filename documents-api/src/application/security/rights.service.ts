import { Injectable } from '@nestjs/common';
import { DocumentRepositoryPort } from 'src/domain/ports/document-repository.port';
import { FolderRepositoryPort } from 'src/domain/ports/folder-repository.port';
import { RightAction, RightResource, RightRule } from 'src/common/authorization/rights.types';
import { prisma } from 'src/infrastructure/persistence/prisma/prisma';
import { SharingAccess, SharingMode, SharingStatus } from 'generated/prisma/client';

@Injectable()
export class RightsService {
  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly folderRepository: FolderRepositoryPort,
  ) {}

  async isAllowed(userId: string, rule: RightRule, resourceId: string, sharingToken?: string): Promise<boolean> {
    switch (rule.resource) {
      case RightResource.FOLDER:
        if (await this.isFolderOwnedByUser(userId, resourceId, !!rule.includeDeleted)) return true;
        return this.hasSharingAccessToFolder(userId, rule, resourceId, sharingToken);
      case RightResource.DOCUMENT:
        if (await this.isDocumentOwnedByUser(userId, resourceId, !!rule.includeDeleted)) return true;
        return this.hasSharingAccessToDocument(userId, rule, resourceId, sharingToken);
      default:
        return false;
    }
  }

  private async isFolderOwnedByUser(userId: string, folderId: string, includeDeleted: boolean): Promise<boolean> {
    const folder = includeDeleted
      ? await this.folderRepository.findByIdIncludingDeleted(folderId)
      : await this.folderRepository.findById(folderId);

    if (!folder) return false;
    return folder.user_id === userId;
  }

  private async isDocumentOwnedByUser(userId: string, documentId: string, includeDeleted: boolean): Promise<boolean> {
    const document = includeDeleted
      ? await this.documentRepository.findByIdIncludingDeleted(documentId)
      : await this.documentRepository.findById(documentId);

    if (!document) return false;

    const folder = includeDeleted
      ? await this.folderRepository.findByIdIncludingDeleted(document.folder_id)
      : await this.folderRepository.findById(document.folder_id);

    if (!folder) return false;
    return folder.user_id === userId;
  }

  private requiredSharingAccessForAction(action: RightAction): 'READ' | 'WRITE' {
    switch (action) {
      case RightAction.READ:
      case RightAction.DOWNLOAD:
        return 'READ';
      default:
        return 'WRITE';
    }
  }

  private sharingAccessSatisfies(linkAccess: SharingAccess, required: 'READ' | 'WRITE'): boolean {
    if (required === 'READ') return linkAccess === SharingAccess.READ || linkAccess === SharingAccess.READ_WRITE;
    return linkAccess === SharingAccess.WRITE || linkAccess === SharingAccess.READ_WRITE;
  }

  private buildActiveSharingLinkWhere(userId: string, required: 'READ' | 'WRITE', sharingToken?: string) {
    const now = new Date();

    const allowedAccess: SharingAccess[] =
      required === 'READ' ? [SharingAccess.READ, SharingAccess.READ_WRITE] : [SharingAccess.WRITE, SharingAccess.READ_WRITE];

    const notExpired = {
      OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    } as const;

    const notDeleted = { deleted_at: null } as const;

    return {
      ...notDeleted,
      access: { in: allowedAccess },
      ...notExpired,
      OR: [
        // PUBLIC: le token est indispensable (sinon n'importe quel user authentifié pourrait profiter d'un partage public existant)
        ...(sharingToken
          ? [
              {
                mode: SharingMode.PUBLIC,
                token: sharingToken,
                status: { in: [SharingStatus.PENDING, SharingStatus.ACCEPTED] },
              },
            ]
          : []),

        // PRIVATE: le recipient authentifié a accès si le lien est ACCEPTED (même si le token n'est pas fourni)
        {
          mode: SharingMode.PRIVATE,
          status: SharingStatus.ACCEPTED,
          recipient_id: userId,
        },
      ],
    } as const;
  }

  private async getFolderAncestorIds(folderId: string, includeDeleted: boolean): Promise<string[]> {
    const rows = includeDeleted
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          WITH RECURSIVE ancestors AS (
            SELECT id, parent_id
            FROM folders
            WHERE id = ${folderId}
            UNION ALL
            SELECT f.id, f.parent_id
            FROM folders f
            JOIN ancestors a ON f.id = a.parent_id
          )
          SELECT id FROM ancestors;
        `
      : await prisma.$queryRaw<Array<{ id: string }>>`
          WITH RECURSIVE ancestors AS (
            SELECT id, parent_id
            FROM folders
            WHERE id = ${folderId} AND deleted_at IS NULL
            UNION ALL
            SELECT f.id, f.parent_id
            FROM folders f
            JOIN ancestors a ON f.id = a.parent_id
            WHERE f.deleted_at IS NULL
          )
          SELECT id FROM ancestors;
        `;

    // Déduplication au cas où
    return Array.from(new Set(rows.map((r) => r.id)));
  }

  private async hasSharingAccessToFolder(userId: string, rule: RightRule, folderId: string, sharingToken?: string): Promise<boolean> {
    const includeDeleted = !!rule.includeDeleted;
    const folder = includeDeleted
      ? await this.folderRepository.findByIdIncludingDeleted(folderId)
      : await this.folderRepository.findById(folderId);
    if (!folder) return false;

    const required = this.requiredSharingAccessForAction(rule.action);
    const folderIds = await this.getFolderAncestorIds(folderId, includeDeleted);
    if (folderIds.length === 0) return false;

    const whereLink = this.buildActiveSharingLinkWhere(userId, required, sharingToken);

    const item = await prisma.sharing_items.findFirst({
      where: {
        deleted_at: null,
        folder_id: { in: folderIds },
        sharing_link: whereLink as any,
      },
      select: {
        id: true,
        sharing_link: { select: { access: true } },
      },
    });

    if (!item) return false;
    return this.sharingAccessSatisfies(item.sharing_link.access, required);
  }

  private async hasSharingAccessToDocument(
    userId: string,
    rule: RightRule,
    documentId: string,
    sharingToken?: string,
  ): Promise<boolean> {
    const includeDeleted = !!rule.includeDeleted;
    const document = includeDeleted
      ? await this.documentRepository.findByIdIncludingDeleted(documentId)
      : await this.documentRepository.findById(documentId);
    if (!document) return false;

    const required = this.requiredSharingAccessForAction(rule.action);

    // Access possible via lien sur le document OU via un dossier ancêtre (incluant le dossier contenant le document)
    const folderIds = await this.getFolderAncestorIds(document.folder_id, includeDeleted);
    const whereLink = this.buildActiveSharingLinkWhere(userId, required, sharingToken);

    const item = await prisma.sharing_items.findFirst({
      where: {
        deleted_at: null,
        sharing_link: whereLink as any,
        OR: [{ document_id: documentId }, ...(folderIds.length ? [{ folder_id: { in: folderIds } }] : [])],
      },
      select: {
        id: true,
        sharing_link: { select: { access: true } },
      },
    });

    if (!item) return false;
    return this.sharingAccessSatisfies(item.sharing_link.access, required);
  }
}

