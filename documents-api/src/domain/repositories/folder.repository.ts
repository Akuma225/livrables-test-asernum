import { FolderEntity } from "../entities/folder.entity";

export interface FolderQueryOptions {
    includeParent?: boolean;
    includeSubFolders?: boolean;
    includeTotalSize?: boolean;
}

export interface IFolderRepository {
    create(folder: FolderEntity): Promise<FolderEntity>;
    update(id: string, folder: Partial<FolderEntity>): Promise<FolderEntity>;
    findById(id: string, options?: FolderQueryOptions): Promise<FolderEntity | null>;
    findByIdIncludingDeleted(id: string, options?: FolderQueryOptions): Promise<FolderEntity | null>;
    findByUserId(userId: string, options?: FolderQueryOptions): Promise<FolderEntity[]>;
    softDelete(id: string, deletedBy?: string): Promise<FolderEntity>;
    findRootFoldersByUserId(userId: string, options?: FolderQueryOptions): Promise<FolderEntity[]>;
    calculateTotalSize(folderId: string): Promise<number>;
    /**
     * Retourne les ids du dossier + tous ses descendants, triés du plus profond au moins profond.
     * (utile pour supprimer sans violer les contraintes FK parent_id)
     */
    getFolderTreeIdsBottomUp(folderId: string, userId: string): Promise<string[]>;
    searchByUserId(userId: string, search: string): Promise<FolderEntity[]>;
    hardDeleteTree(folderIdsBottomUp: string[]): Promise<void>;
}
