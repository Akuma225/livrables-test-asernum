import { IDocumentRepository } from "../repositories/document.repository";
import { DocumentEntity } from "../entities/document.entity";

export abstract class DocumentRepositoryPort implements IDocumentRepository {
    abstract create(document: DocumentEntity): Promise<DocumentEntity>;
    abstract update(id: string, document: Partial<DocumentEntity>): Promise<DocumentEntity>;
    abstract findById(id: string): Promise<DocumentEntity | null>;
    abstract findByIdIncludingDeleted(id: string): Promise<DocumentEntity | null>;
    abstract findByFolderId(folderId: string): Promise<DocumentEntity[]>;
    abstract findByFolderIdsIncludingDeleted(folderIds: string[]): Promise<DocumentEntity[]>;
    abstract hardDeleteByFolderIds(folderIds: string[]): Promise<number>;
    abstract searchByUserId(userId: string, search: string): Promise<DocumentEntity[]>;
    abstract softDelete(id: string, deletedBy?: string): Promise<DocumentEntity>;
    abstract restore(id: string, restoredBy?: string): Promise<DocumentEntity>;
    abstract hardDelete(id: string): Promise<void>;
    abstract calculateUserTotalSize(userId: string): Promise<number>;
    abstract findUploadedByFolderIds(folderIds: string[]): Promise<DocumentEntity[]>;
}
