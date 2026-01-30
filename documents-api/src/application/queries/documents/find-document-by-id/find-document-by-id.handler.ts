import { NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { FindDocumentByIdQuery } from "./find-document-by-id.query";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentVm } from "src/application/viewmodels/document.vm";
import { DocumentStoragePort } from "src/domain/ports/document-storage.port";
import { UploadStatus } from "src/domain/entities/document.entity";

@QueryHandler(FindDocumentByIdQuery)
export class FindDocumentByIdQueryHandler implements IQueryHandler<FindDocumentByIdQuery> {
    constructor(
        private readonly documentRepository: DocumentRepositoryPort,
        private readonly folderRepository: FolderRepositoryPort,
        private readonly storage: DocumentStoragePort,
    ) {}

    async execute(query: FindDocumentByIdQuery): Promise<DocumentVm> {
        const document = await this.documentRepository.findById(query.id ?? "");

        if (!document) {
            throw new NotFoundException("Le document n'existe pas");
        }

        // Vérifier l'accès via le dossier qui contient le document
        const folder = await this.folderRepository.findById(document.folder_id);
        if (!folder) {
            throw new NotFoundException("Le dossier n'existe pas");
        }

        document.folder = folder;

        const status = document.upload_status ?? UploadStatus.STAGING;
        const url =
            status === UploadStatus.UPLOADED
                ? await this.storage.getSignedUrlFromProduction(document.path)
                : await this.storage.getSignedUrl(document.path);

        return new DocumentVm(document, { url });
    }
}

