import { BadRequestException, NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentStoragePort } from "src/domain/ports/document-storage.port";
import { UploadStatus } from "src/domain/entities/document.entity";
import { DownloadDocumentQuery } from "./download-document.query";

export interface DownloadDocumentResult {
    buffer: Buffer;
    contentType?: string;
    filename: string;
}

@QueryHandler(DownloadDocumentQuery)
export class DownloadDocumentQueryHandler implements IQueryHandler<DownloadDocumentQuery> {
    constructor(
        private readonly documentRepository: DocumentRepositoryPort,
        private readonly folderRepository: FolderRepositoryPort,
        private readonly storage: DocumentStoragePort,
    ) {}

    async execute(query: DownloadDocumentQuery): Promise<DownloadDocumentResult> {
        const document = await this.documentRepository.findById(query.id!);
        if (!document) {
            throw new NotFoundException("Le document n'existe pas");
        }

        const folder = await this.folderRepository.findById(document.folder_id);
        if (!folder) {
            throw new NotFoundException("Le dossier n'existe pas");
        }

        if (document.deleted_at) {
            throw new NotFoundException("Le document n'existe pas");
        }

        if ((document.upload_status ?? UploadStatus.STAGING) !== UploadStatus.UPLOADED) {
            throw new BadRequestException("Le document n'est pas disponible au téléchargement");
        }

        const { buffer, contentType } = await this.storage.downloadFromProduction(document.path);
        return {
            buffer,
            contentType: contentType ?? document.mime_type ?? "application/octet-stream",
            filename: document.original_name,
        };
    }
}

