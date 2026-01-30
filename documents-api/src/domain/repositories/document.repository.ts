import { DocumentEntity } from "../entities/document.entity";

export interface IDocumentRepository {
    create(document: DocumentEntity): Promise<DocumentEntity>;
    update(id: string, document: Partial<DocumentEntity>): Promise<DocumentEntity>;
    findById(id: string): Promise<DocumentEntity | null>;
    findByIdIncludingDeleted(id: string): Promise<DocumentEntity | null>;
    findByFolderId(folderId: string): Promise<DocumentEntity[]>;
    findByFolderIdsIncludingDeleted(folderIds: string[]): Promise<DocumentEntity[]>;
    hardDeleteByFolderIds(folderIds: string[]): Promise<number>;
    findUploadedByFolderIds(folderIds: string[]): Promise<DocumentEntity[]>;
    searchByUserId(userId: string, search: string): Promise<DocumentEntity[]>;
    softDelete(id: string, deletedBy?: string): Promise<DocumentEntity>;
    restore(id: string, restoredBy?: string): Promise<DocumentEntity>;
    hardDelete(id: string): Promise<void>;
    calculateUserTotalSize(userId: string): Promise<number>;
}
