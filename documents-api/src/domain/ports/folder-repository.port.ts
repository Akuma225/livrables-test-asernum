import { FolderEntity } from "../entities/folder.entity";
import { FolderQueryOptions, IFolderRepository } from "../repositories/folder.repository";

export abstract class FolderRepositoryPort implements IFolderRepository {
    abstract create(folder: FolderEntity): Promise<FolderEntity>;
    abstract update(id: string, folder: Partial<FolderEntity>): Promise<FolderEntity>;
    abstract findById(id: string, options?: FolderQueryOptions): Promise<FolderEntity | null>;
    abstract findByIdIncludingDeleted(id: string, options?: FolderQueryOptions): Promise<FolderEntity | null>;
    abstract findByUserId(userId: string, options?: FolderQueryOptions): Promise<FolderEntity[]>;
    abstract softDelete(id: string, deletedBy?: string): Promise<FolderEntity>;
    abstract findRootFoldersByUserId(userId: string, options?: FolderQueryOptions): Promise<FolderEntity[]>;
    abstract calculateTotalSize(folderId: string): Promise<number>;
    abstract getFolderTreeIdsBottomUp(folderId: string, userId: string): Promise<string[]>;
    abstract searchByUserId(userId: string, search: string): Promise<FolderEntity[]>;

    abstract hardDeleteTree(folderIdsBottomUp: string[]): Promise<void>;
}
