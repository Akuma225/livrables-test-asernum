import { Injectable } from "@nestjs/common";
import { DocumentEntity, UploadStatus } from "src/domain/entities/document.entity";
import { IDocumentRepository } from "src/domain/repositories/document.repository";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { prisma } from "../prisma/prisma";
import { Prisma } from "generated/prisma/client";

@Injectable()
export class DocumentRepository extends DocumentRepositoryPort implements IDocumentRepository {

    async create(document: DocumentEntity): Promise<DocumentEntity> {
        return await prisma.documents.create({
            data: {
                folder_id: document.folder_id,
                original_name: document.original_name,
                stored_name: document.stored_name,
                path: document.path,
                mime_type: document.mime_type,
                size: document.size,
                upload_status: document.upload_status,
                hash: document.hash,
                metadata: document.metadata as Prisma.InputJsonValue,
                created_by: document.created_by,
            },
            include: {
                folder: true,
            },
        }) as unknown as DocumentEntity;
    }

    async update(id: string, document: Partial<DocumentEntity>): Promise<DocumentEntity> {
        return await prisma.documents.update({
            where: { id },
            data: {
                folder_id: document.folder_id,
                original_name: document.original_name,
                stored_name: document.stored_name,
                path: document.path,
                mime_type: document.mime_type,
                size: document.size,
                upload_status: document.upload_status,
                hash: document.hash,
                metadata: document.metadata as Prisma.InputJsonValue,
                updated_by: document.updated_by,
            },
        }) as unknown as DocumentEntity;
    }

    async findById(id: string): Promise<DocumentEntity | null> {
        return await prisma.documents.findFirst({
            where: {
                id,
                deleted_at: null,
            },
        }) as unknown as DocumentEntity | null;
    }

    async findByIdIncludingDeleted(id: string): Promise<DocumentEntity | null> {
        return await prisma.documents.findFirst({
            where: {
                id,
            },
        }) as unknown as DocumentEntity | null;
    }

    async findByFolderId(folderId: string): Promise<DocumentEntity[]> {
        return await prisma.documents.findMany({
            where: {
                folder_id: folderId,
                deleted_at: null,
            },
            orderBy: [
                { original_name: 'asc' },
                { created_at: 'asc' },
            ],
        }) as unknown as DocumentEntity[];
    }

    async findByFolderIdsIncludingDeleted(folderIds: string[]): Promise<DocumentEntity[]> {
        if (folderIds.length === 0) return [];

        return await prisma.documents.findMany({
            where: {
                folder_id: { in: folderIds },
            },
            orderBy: {
                created_at: 'desc',
            },
        }) as unknown as DocumentEntity[];
    }

    async hardDeleteByFolderIds(folderIds: string[]): Promise<number> {
        if (folderIds.length === 0) return 0;

        const result = await prisma.documents.deleteMany({
            where: {
                folder_id: { in: folderIds },
            },
        });

        return result.count;
    }

    async searchByUserId(userId: string, search: string): Promise<DocumentEntity[]> {
        const q = search.trim();
        if (!q) return [];

        return await prisma.documents.findMany({
            where: {
                deleted_at: null,
                folder: {
                    user_id: userId,
                    deleted_at: null,
                },
                OR: [
                    {
                        original_name: {
                            contains: q,
                            mode: 'insensitive',
                        },
                    },
                    {
                        stored_name: {
                            contains: q,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            include: {
                folder: true,
            },
            orderBy: [
                { original_name: 'asc' },
                { created_at: 'asc' },
            ],
        }) as unknown as DocumentEntity[];
    }

    async findUploadedByFolderIds(folderIds: string[]): Promise<DocumentEntity[]> {
        if (folderIds.length === 0) return [];

        return await prisma.documents.findMany({
            where: {
                folder_id: { in: folderIds },
                deleted_at: null,
                upload_status: UploadStatus.UPLOADED,
            },
            // Important: on trie d'abord par folder_id pour que le regroupement en mémoire
            // conserve un ordre stable par dossier, puis par original_name croissant.
            orderBy: [
                { folder_id: 'asc' },
                { original_name: 'asc' },
                { created_at: 'asc' },
            ],
        }) as unknown as DocumentEntity[];
    }

    async softDelete(id: string, deletedBy?: string): Promise<DocumentEntity> {
        return await prisma.documents.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        }) as unknown as DocumentEntity;
    }

    async restore(id: string, restoredBy?: string): Promise<DocumentEntity> {
        return await prisma.documents.update({
            where: { id },
            data: {
                deleted_at: null,
                deleted_by: null,
                updated_by: restoredBy,
            },
        }) as unknown as DocumentEntity;
    }

    async hardDelete(id: string): Promise<void> {
        await prisma.documents.delete({
            where: { id },
        });
    }

    async calculateUserTotalSize(userId: string): Promise<number> {
        // Récupérer tous les dossiers de l'utilisateur
        const folders = await prisma.folders.findMany({
            where: {
                user_id: userId,
                deleted_at: null,
            },
            select: { id: true },
        });

        const folderIds = folders.map(f => f.id);

        if (folderIds.length === 0) {
            return 0;
        }

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
}
