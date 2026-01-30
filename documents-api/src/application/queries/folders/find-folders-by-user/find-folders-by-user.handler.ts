import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { FindFoldersByUserQuery } from "./find-folders-by-user.query";
import { FolderEntity } from "src/domain/entities/folder.entity";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";

@QueryHandler(FindFoldersByUserQuery)
export class FindFoldersByUserQueryHandler implements IQueryHandler<FindFoldersByUserQuery> {
    constructor(
        private readonly folderRepository: FolderRepositoryPort,
        private readonly documentRepository: DocumentRepositoryPort,
    ) {}

    async execute(query: FindFoldersByUserQuery): Promise<FolderEntity[]> {
        const { includeParent = false, includeSubFolders = false, includeTotalSize = false, includeDocuments = false, treeView = false } = query.params ?? {};

        // Si treeView est activé, on retourne uniquement les dossiers racine avec leur arborescence complète
        if (treeView) {
            const options = { 
                includeParent, 
                includeSubFolders: true, // En mode tree, les sous-dossiers sont toujours inclus
                includeTotalSize 
            };
            const roots = await this.folderRepository.findRootFoldersByUserId(query.user_id, options);

            if (includeDocuments) {
                await this.enrichWithDocuments(roots);
            }

            return roots;
        }

        // Sinon, on retourne tous les dossiers de l'utilisateur
        const options = { includeParent, includeSubFolders, includeTotalSize };
        const folders = await this.folderRepository.findByUserId(query.user_id, options);

        if (includeDocuments) {
            await this.enrichWithDocuments(folders);
        }

        return folders;
    }

    private async enrichWithDocuments(folders: FolderEntity[]) {
        const folderIds = this.collectFolderIdsFromList(folders);
        const documents = await this.documentRepository.findUploadedByFolderIds(folderIds);
        const docsByFolderId = this.groupByFolderId(documents);

        for (const folder of folders) {
            this.attachDocumentsRecursive(folder, docsByFolderId);
        }
    }

    private collectFolderIdsFromList(folders: FolderEntity[]): string[] {
        const ids: string[] = [];
        const visit = (f: FolderEntity) => {
            if (f.id) ids.push(f.id);
            for (const sub of f.sub_folders ?? []) visit(sub);
        };
        for (const folder of folders) visit(folder);
        return ids;
    }

    private groupByFolderId(documents: any[]): Record<string, any[]> {
        const map: Record<string, any[]> = {};
        for (const doc of documents) {
            const folderId = doc.folder_id;
            if (!folderId) continue;
            (map[folderId] ??= []).push(doc);
        }
        return map;
    }

    private attachDocumentsRecursive(folder: FolderEntity, docsByFolderId: Record<string, any[]>) {
        if (folder.id) {
            folder.documents = (docsByFolderId[folder.id] ?? []) as any;
        }
        for (const sub of folder.sub_folders ?? []) {
            this.attachDocumentsRecursive(sub, docsByFolderId);
        }
    }
}
