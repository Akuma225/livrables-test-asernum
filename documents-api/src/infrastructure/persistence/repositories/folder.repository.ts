import { FolderEntity } from "src/domain/entities/folder.entity";
import { FolderQueryOptions, IFolderRepository } from "src/domain/repositories/folder.repository";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { prisma } from "../prisma/prisma";

export class FolderRepository extends FolderRepositoryPort implements IFolderRepository {
    
    private buildSubFoldersInclude(depth: number = 5): any {
        if (depth === 0) return false;
        return {
            where: { deleted_at: null },
            orderBy: { name: 'asc' },
            include: {
                sub_folders: this.buildSubFoldersInclude(depth - 1)
            }
        };
    }

    private buildIncludeOptions(options: FolderQueryOptions): any {
        const { includeParent = false, includeSubFolders = false } = options;
        
        const include: any = {};
        
        if (includeParent) {
            include.parent = {
                where: { deleted_at: null }
            };
        }
        
        if (includeSubFolders) {
            include.sub_folders = this.buildSubFoldersInclude();
        }
        
        return Object.keys(include).length > 0 ? include : undefined;
    }

    async create(folder: FolderEntity): Promise<FolderEntity> {
        return await prisma.folders.create({
            data: {
                parent_id: folder.parent_id,
                user_id: folder.user_id,
                name: folder.name,
                created_by: folder.created_by,
            },
        }) as FolderEntity;
    }

    async update(id: string, folder: Partial<FolderEntity>): Promise<FolderEntity> {
        return await prisma.folders.update({
            where: { id },
            data: {
                parent_id: folder.parent_id,
                name: folder.name,
                updated_by: folder.updated_by,
            },
        }) as FolderEntity;
    }

    async findById(id: string, options: FolderQueryOptions = {}): Promise<FolderEntity | null> {
        const { includeSubFolders = false, includeTotalSize = false } = options;

        const folder = await prisma.folders.findFirst({
            where: {
                id,
                deleted_at: null,
            },
            include: this.buildIncludeOptions(options),
        }) as FolderEntity | null;

        if (folder && includeTotalSize) {
            folder.total_size = await this.calculateTotalSize(folder.id!);
            if (includeSubFolders && folder.sub_folders) {
                await this.addTotalSizeToSubFolders(folder.sub_folders);
            }
        }

        return folder;
    }

    async findByIdIncludingDeleted(id: string, options: FolderQueryOptions = {}): Promise<FolderEntity | null> {
        const { includeSubFolders = false, includeTotalSize = false } = options;

        const folder = await prisma.folders.findFirst({
            where: {
                id,
            },
            include: this.buildIncludeOptions(options),
        }) as FolderEntity | null;

        if (folder && includeTotalSize) {
            folder.total_size = await this.calculateTotalSize(folder.id!);
            if (includeSubFolders && folder.sub_folders) {
                await this.addTotalSizeToSubFolders(folder.sub_folders);
            }
        }

        return folder;
    }

    async findByUserId(userId: string, options: FolderQueryOptions = {}): Promise<FolderEntity[]> {
        const { includeSubFolders = false, includeTotalSize = false } = options;

        const folders = await prisma.folders.findMany({
            where: {
                user_id: userId,
                deleted_at: null,
            },
            include: this.buildIncludeOptions(options),
            orderBy: {
                name: 'asc',
            },
        }) as FolderEntity[];

        if (includeTotalSize) {
            await this.addTotalSizeToFolders(folders, includeSubFolders);
        }

        return folders;
    }

    async findRootFoldersByUserId(userId: string, options: FolderQueryOptions = {}): Promise<FolderEntity[]> {
        const { includeSubFolders = false, includeTotalSize = false } = options;

        const folders = await prisma.folders.findMany({
            where: {
                user_id: userId,
                parent_id: null,
                deleted_at: null,
            },
            include: this.buildIncludeOptions(options),
            orderBy: {
                name: 'asc',
            },
        }) as FolderEntity[];

        if (includeTotalSize) {
            await this.addTotalSizeToFolders(folders, includeSubFolders);
        }

        return folders;
    }

    async softDelete(id: string, deletedBy?: string): Promise<FolderEntity> {
        return await prisma.folders.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        }) as FolderEntity;
    }

    async calculateTotalSize(folderId: string): Promise<number> {
        // Récupérer tous les IDs de dossiers (le dossier actuel + tous ses sous-dossiers récursivement)
        const folderIds = await this.getAllSubFolderIds(folderId);
        folderIds.push(folderId);

        // Calculer la somme des tailles des documents dans tous ces dossiers
        const result = await prisma.documents.aggregate({
            where: {
                folder_id: { in: folderIds },
                deleted_at: null,
            },
            _sum: {
                size: true,
            },
        });

        return result._sum.size ?? 0;
    }

    async getFolderTreeIdsBottomUp(folderId: string, userId: string): Promise<string[]> {
        const rows = await prisma.$queryRaw<Array<{ id: string; depth: number }>>`
            WITH RECURSIVE tree AS (
                SELECT id, parent_id, 0::int AS depth
                FROM folders
                WHERE id = ${folderId} AND user_id = ${userId}
                UNION ALL
                SELECT f.id, f.parent_id, (tree.depth + 1)::int AS depth
                FROM folders f
                JOIN tree ON f.parent_id = tree.id
                WHERE f.user_id = ${userId}
            )
            SELECT id, depth FROM tree ORDER BY depth DESC;
        `;

        return rows.map(r => r.id);
    }

    async searchByUserId(userId: string, search: string): Promise<FolderEntity[]> {
        const q = search.trim();
        if (!q) return [];

        return await prisma.folders.findMany({
            where: {
                user_id: userId,
                deleted_at: null,
                name: {
                    contains: q,
                    mode: 'insensitive',
                },
            },
            orderBy: { name: 'asc' },
        }) as FolderEntity[];
    }

    async hardDeleteTree(folderIdsBottomUp: string[]): Promise<void> {
        if (folderIdsBottomUp.length === 0) return;

        await prisma.$transaction(async (tx) => {
            await tx.documents.deleteMany({
                where: {
                    folder_id: { in: folderIdsBottomUp },
                },
            });

            for (const folderId of folderIdsBottomUp) {
                await tx.folders.delete({ where: { id: folderId } });
            }
        });
    }

    private async getAllSubFolderIds(folderId: string): Promise<string[]> {
        const subFolders = await prisma.folders.findMany({
            where: {
                parent_id: folderId,
                deleted_at: null,
            },
            select: { id: true },
        });

        const ids: string[] = subFolders.map(f => f.id);
        
        for (const subFolder of subFolders) {
            const nestedIds = await this.getAllSubFolderIds(subFolder.id);
            ids.push(...nestedIds);
        }

        return ids;
    }

    private async addTotalSizeToFolders(folders: FolderEntity[], includeSubFolders: boolean): Promise<void> {
        for (const folder of folders) {
            folder.total_size = await this.calculateTotalSize(folder.id!);
            if (includeSubFolders && folder.sub_folders) {
                await this.addTotalSizeToSubFolders(folder.sub_folders);
            }
        }
    }

    private async addTotalSizeToSubFolders(folders: FolderEntity[]): Promise<void> {
        for (const folder of folders) {
            folder.total_size = await this.calculateTotalSize(folder.id!);
            if (folder.sub_folders) {
                await this.addTotalSizeToSubFolders(folder.sub_folders);
            }
        }
    }
}
