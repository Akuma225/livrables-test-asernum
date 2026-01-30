import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { SearchQuery } from "./search.query";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderVm } from "src/application/viewmodels/folder.vm";
import { DocumentVm } from "src/application/viewmodels/document.vm";

@QueryHandler(SearchQuery)
export class SearchQueryHandler implements IQueryHandler<SearchQuery> {
    constructor(
        private readonly folderRepository: FolderRepositoryPort,
        private readonly documentRepository: DocumentRepositoryPort,
    ) {}

    async execute(query: SearchQuery): Promise<{ folders: FolderVm[]; documents: DocumentVm[] }> {
        const q = (query.params?.q ?? "").trim();
        const type = query.params?.type ?? 'all';

        if (!q) {
            return { folders: [], documents: [] };
        }

        const folders =
            type === 'documents'
                ? []
                : (await this.folderRepository.searchByUserId(query.user_id, q)).map(f => new FolderVm(f));

        const documents =
            type === 'folders'
                ? []
                : (await this.documentRepository.searchByUserId(query.user_id, q)).map(d => new DocumentVm(d));

        return { folders, documents };
    }
}

