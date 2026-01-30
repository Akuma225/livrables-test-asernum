import { IPaginationParams, PaginationService } from '@akuma225/pagination';
import { BadRequestException, ForbiddenException, GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, SharingMode, SharingStatus, UploadStatus } from '../../../generated/prisma/client';
import { ModelMappingTable } from 'src/commons/enums/model-mapping-table.enum';
import { AccessTokenData } from 'src/commons/interfaces/access-token-data';
import { FilterSharingLinkListDto } from './dto/filter-sharing-link-list.dto';
import { CreateSharingLinkDto, CreateSharingLinkItemDto } from './dto/create-sharing-link.dto';
import { randomToken } from '@akuma225/random';
import { UpdateSharingLinkDto } from './dto/update-sharing-link.dto';
import { TreatPendingSharingLinkDto } from './dto/treat-pending-sharing-link.dto';
import { ModerationStatus } from 'src/commons/enums/moderation-status.enum';
import { SharingLinkQueuesService } from './queue/sharing-link.queues.service';
import { SharingLinkRepository, sharingLinkDefaultInclude } from './sharing-link.repository';

@Injectable()
export class SharingLinkService {
    private readonly logger = new Logger(SharingLinkService.name);

    private readonly defaultInclude: Prisma.sharing_linksInclude = sharingLinkDefaultInclude;

    constructor(
        private readonly paginationService: PaginationService,
        private readonly sharingLinkQueuesService: SharingLinkQueuesService,
        private readonly sharingLinkRepository: SharingLinkRepository,
    ) {}

    async findAllEmittedForConnectedUser(
        connectedUser: AccessTokenData,
        filter: FilterSharingLinkListDto,
        params: IPaginationParams
    ) {
        const whereClause: Prisma.sharing_linksWhereInput = {
            owner_id: connectedUser.sub,
            deleted_at: null,
            ...filter
        }

        return this.paginationService.paginate({
            model: ModelMappingTable.SHARING_LINK,
            where: whereClause,
            include: this.defaultInclude,
            params: params,
            orderBy: [ { created_at: 'desc' } ]
        })
    }

    async findAllReceivedForConnectedUser(
        connectedUser: AccessTokenData,
        filter: FilterSharingLinkListDto,
        params: IPaginationParams
    ) {
        const whereClause: Prisma.sharing_linksWhereInput = {
            recipient_id: connectedUser.sub,
            deleted_at: null,
            ...filter
        }

        return this.paginationService.paginate({
            model: ModelMappingTable.SHARING_LINK,
            where: whereClause,
            include: this.defaultInclude,
            params: params,
            orderBy: [ { created_at: 'desc' } ]
        })
    }

    async findById(id: string) {
        const sharingLink = await this.sharingLinkRepository.findById(id, this.defaultInclude);
        return this.assertSharingLinkAccessible(sharingLink);
    }

    async findByToken(token: string) {
        const sharingLink = await this.sharingLinkRepository.findByToken(token, this.defaultInclude);
        return this.assertSharingLinkAccessible(sharingLink);
    }

    async create(
        data: CreateSharingLinkDto,
        connectedUser: AccessTokenData
    ) {
        await this.validateSharingLinkItems(data.items, connectedUser.sub);

        if (data.mode === SharingMode.PRIVATE && !data.recipient_id) {
            throw new BadRequestException('Un lien de partage privé doit avoir un destinataire')
        }

        const initialStatus = data.mode === SharingMode.PRIVATE ? SharingStatus.PENDING : SharingStatus.ACCEPTED;
        const token = this.generateToken();

        const payload: Prisma.sharing_linksCreateInput = {
            token,
            owner: {
                connect: {
                    id: connectedUser.sub
                }
            },
            ...(data.recipient_id
                ? {
                      recipient: {
                          connect: { id: data.recipient_id },
                      },
                  }
                : {}),
            ...(data.mode ? { mode: data.mode } : {}),
            ...(data.access ? { access: data.access } : {}),
            ...(data.expiration_date ? { expires_at: new Date(data.expiration_date) } : {}),
            status: initialStatus,
        }

        const sharingLink = await this.sharingLinkRepository.create(payload)

        await this.createSharingLinkItems(sharingLink.id, data.items);

        if (sharingLink.mode === SharingMode.PRIVATE && sharingLink.status === SharingStatus.PENDING) {
            const hours = Number(process.env.INVITATION_EXPIRATION_HOURS ?? 48);
            const delayMs = Math.max(0, hours) * 60 * 60 * 1000;
            await this.sharingLinkQueuesService.scheduleInvitationExpiration(sharingLink.id, delayMs);
        }

        if (sharingLink.expires_at) {
            await this.sharingLinkQueuesService.scheduleSharingLinkExpiration(sharingLink.id, sharingLink.expires_at);
        }

        return this.findById(sharingLink.id);
    }

    async update(
        id: string,
        data: UpdateSharingLinkDto,
        connectedUser: AccessTokenData
    ) {
        const sharingLink = await this.findById(id);

        if (sharingLink.owner_id !== connectedUser.sub) {
            throw new ForbiddenException('Vous n\'avez pas les permissions pour mettre à jour ce lien de partage')
        }

        const payload: Prisma.sharing_linksUpdateInput = {
            ...(data.mode && { mode: data.mode }),
            ...(data.access && { access: data.access }),
        }

        const updatedSharingLink = await this.sharingLinkRepository.update(id, payload)

        return this.findById(updatedSharingLink.id);
    }

    async treatPendingSharingLink(
        id: string,
        data: TreatPendingSharingLinkDto,
        connectedUser: AccessTokenData
    ) {
        const sharingLink = await this.findById(id);

        if (sharingLink.status !== SharingStatus.PENDING) {
            throw new BadRequestException('Le lien de partage n\'est pas en attente de validation')
        }

        if (sharingLink.recipient_id !== connectedUser.sub) {
            throw new ForbiddenException('Vous n\'avez pas les permissions pour valider ou refuser ce lien de partage')
        }

        await this.updateSharingLinkStatus(sharingLink, data.status === ModerationStatus.APPROVED ? SharingStatus.ACCEPTED : SharingStatus.REJECTED, data.reason, connectedUser.sub);
        await this.sharingLinkQueuesService.cancelInvitationExpiration(sharingLink.id);

        return this.findById(sharingLink.id);
    }

    async revoke(
        id: string,
        connectedUser: AccessTokenData,
        reason?: string,
    ) {
        const sharingLink = await this.findById(id);

        if (sharingLink.owner_id !== connectedUser.sub) {
            throw new ForbiddenException('Vous n\'avez pas les permissions pour révoquer ce lien de partage')
        }

        const allowedStatuses = [SharingStatus.PENDING, SharingStatus.ACCEPTED] as SharingStatus[];
        if (!allowedStatuses.includes(sharingLink.status)) {
            throw new BadRequestException('Le lien de partage ne peut pas être révoqué car il n\'est pas actif')
        }

        await this.updateSharingLinkStatus(
            sharingLink,
            SharingStatus.REVOKED,
            reason,
            connectedUser.sub
        );

        await this.sharingLinkQueuesService.cancelInvitationExpiration(sharingLink.id);
        await this.sharingLinkQueuesService.cancelSharingLinkExpiration(sharingLink.id);

        return this.findById(sharingLink.id);
    }

    private generateToken() {
        return `${randomToken(10)}_${Date.now()}`;
    }

    private assertSharingLinkAccessible<T extends { deleted_at: Date | null; status: SharingStatus }>(sharingLink: T | null): T {
        if (!sharingLink) {
            throw new NotFoundException('Le lien de partage n\'a pas été trouvé')
        }

        if (sharingLink.deleted_at) {
            throw new NotFoundException('Le lien de partage a été supprimé')
        }

        if (sharingLink.status === SharingStatus.REVOKED) {
            throw new BadRequestException('Le lien de partage a été révoqué')
        }

        if (sharingLink.status === SharingStatus.EXPIRED) {
            throw new GoneException('Le lien de partage a expiré et n\'est plus accessible')
        }

        return sharingLink;
    }

    private async validateSharingLinkItems(items: CreateSharingLinkItemDto[], connectedUserId: string) {
        this.validateItemsShape(items);

        const documentIds = this.getUniqueDocumentIds(items);
        const folderIds = this.getUniqueFolderIds(items);

        await this.assertFoldersOwned(folderIds, connectedUserId);
        await this.assertDocumentsOwnedAndShareable(documentIds, connectedUserId);

        return true;
    }

    private validateItemsShape(items: CreateSharingLinkItemDto[]) {
        for (const item of items) {
            const hasDocument = !!item.document_id;
            const hasFolder = !!item.folder_id;

            if (!hasDocument && !hasFolder) {
                throw new BadRequestException('Un item de partage doit contenir soit un document, soit un dossier')
            }

            if (hasDocument && hasFolder) {
                throw new BadRequestException('Un item de partage ne peut pas contenir à la fois un document et un dossier')
            }
        }
    }

    private getUniqueDocumentIds(items: CreateSharingLinkItemDto[]) {
        return Array.from(new Set(items.filter(i => !!i.document_id).map(i => i.document_id!)));
    }

    private getUniqueFolderIds(items: CreateSharingLinkItemDto[]) {
        return Array.from(new Set(items.filter(i => !!i.folder_id).map(i => i.folder_id!)));
    }

    private async assertFoldersOwned(folderIds: string[], connectedUserId: string) {
        if (folderIds.length === 0) return;

        const ownedFolders = await this.sharingLinkRepository.getOwnedFolderIds(folderIds, connectedUserId);
        const ownedSet = new Set(ownedFolders.map(f => f.id));
        const notOwned = folderIds.filter(id => !ownedSet.has(id));

        if (notOwned.length > 0) {
            this.logger.warn(`Tentative de partage de dossiers non possédés: ${notOwned.join(', ')}`);
            throw new BadRequestException('Un ou plusieurs dossiers ne vous appartiennent pas (ou n’existent pas)')
        }
    }

    private async assertDocumentsOwnedAndShareable(documentIds: string[], connectedUserId: string) {
        if (documentIds.length === 0) return;

        const ownedDocuments = await this.sharingLinkRepository.getOwnedDocumentIds(documentIds, connectedUserId);
        const ownedById = new Map(ownedDocuments.map(d => [d.id, d]));
        const notOwned = documentIds.filter(id => !ownedById.has(id));

        if (notOwned.length > 0) {
            this.logger.warn(`Tentative de partage de documents non possédés: ${notOwned.join(', ')}`);
            throw new BadRequestException('Un ou plusieurs documents ne vous appartiennent pas (ou n’existent pas)')
        }

        const deletedDocuments = ownedDocuments
          .filter(d => !!d.deleted_at || !!d.folder?.deleted_at)
          .map(d => d.id);

        if (deletedDocuments.length > 0) {
            this.logger.warn(`Tentative de partage de documents supprimés: ${deletedDocuments.join(', ')}`);
            throw new BadRequestException('Un ou plusieurs documents ont été supprimés')
        }

        const notUploadedDocuments = ownedDocuments
          .filter(d => d.upload_status !== UploadStatus.UPLOADED)
          .map(d => d.id);

        if (notUploadedDocuments.length > 0) {
            this.logger.warn(`Tentative de partage de documents non uploadés: ${notUploadedDocuments.join(', ')}`);
            throw new BadRequestException('Un ou plusieurs documents ne sont pas encore uploadés')
        }
    }

    private async createSharingLinkItems(sharingLinkId: string, items: CreateSharingLinkItemDto[]) {
        await this.sharingLinkRepository.createItemsMany(sharingLinkId, items)

        return true;
    }

    private async updateSharingLinkStatus(sharingLink: { id: string; status: SharingStatus }, status: SharingStatus, reason?: string, createdBy?: string) {
        await this.sharingLinkRepository.setStatusWithHistory({
            sharingLinkId: sharingLink.id,
            previousStatus: sharingLink.status,
            newStatus: status,
            reason,
            createdBy
        });

        return true;
    }

    async expireInvitationIfStillPending(sharingLinkId: string): Promise<void> {
        const sharingLink = await this.sharingLinkRepository.getForInvitationExpiration(sharingLinkId)

        if (!sharingLink || sharingLink.deleted_at) return;
        if (!this.sharingLinkRepository.isPrivatePendingInvitation(sharingLink)) return;

        await this.updateSharingLinkStatus(
            sharingLink,
            SharingStatus.INVITATION_EXPIRED,
            'Invitation expirée',
            'system'
        );

        // Plus besoin de l'expiration "date" si l'invitation a expiré
        await this.sharingLinkQueuesService.cancelSharingLinkExpiration(sharingLinkId);
    }

    async expireSharingLinkIfDue(sharingLinkId: string): Promise<void> {
        const sharingLink = await this.sharingLinkRepository.getForSharingLinkExpiration(sharingLinkId)

        if (!sharingLink || sharingLink.deleted_at) return;
        if (!sharingLink.expires_at) return;
        const terminalStatuses: SharingStatus[] = [SharingStatus.EXPIRED, SharingStatus.REVOKED];
        if (terminalStatuses.includes(sharingLink.status)) return;

        const now = Date.now();
        if (sharingLink.expires_at.getTime() > now) {
            // Horloge/latence: on replanifie à la bonne date
            await this.sharingLinkQueuesService.scheduleSharingLinkExpiration(sharingLinkId, sharingLink.expires_at);
            return;
        }

        await this.updateSharingLinkStatus(
            sharingLink,
            SharingStatus.EXPIRED,
            'Lien de partage expiré',
            'system'
        );

        // Si le lien a expiré, on annule une éventuelle expiration d'invitation
        await this.sharingLinkQueuesService.cancelInvitationExpiration(sharingLinkId);
    }
}
