import { NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { FindFolderByIdQuery } from "./find-folder-by-id.query";
import { FolderEntity } from "src/domain/entities/folder.entity";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";

@QueryHandler(FindFolderByIdQuery)
export class FindFolderByIdQueryHandler implements IQueryHandler<FindFolderByIdQuery> {
    constructor(
        private readonly folderRepository: FolderRepositoryPort,
        private readonly documentRepository: DocumentRepositoryPort,
    ) {}

    async execute(query: FindFolderByIdQuery): Promise<FolderEntity> {
        const { includeParent = false, includeSubFolders = false, includeTotalSize = false, includeDocuments = false } = query.params ?? {};
        
        const folder = await this.folderRepository.findById(query.id ?? '', {
            includeParent,
            includeSubFolders,
            includeTotalSize,
        });
        
        if (!folder) {
            throw new NotFoundException('Le dossier n\'existe pas');
        }

        if (includeDocuments) {
            const folderIds = this.collectFolderIds(folder);
            const documents = await this.documentRepository.findUploadedByFolderIds(folderIds);
            const docsByFolderId = this.groupByFolderId(documents);
            this.attachDocumentsRecursive(folder, docsByFolderId);
        }

        return folder;
    }

    private collectFolderIds(folder: FolderEntity): string[] {
        const ids: string[] = [];
        const visit = (f: FolderEntity) => {
            if (f.id) ids.push(f.id);
            for (const sub of f.sub_folders ?? []) visit(sub);
        };
        visit(folder);
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
