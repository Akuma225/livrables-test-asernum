import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { createHash, randomUUID } from "crypto";
import { UploadDocumentCommand } from "./upload-document.command";
import { DocumentEntity, UploadStatus } from "src/domain/entities/document.entity";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentStoragePort } from "src/domain/ports/document-storage.port";
import { DocumentVm } from "src/application/viewmodels/document.vm";
import { ProcessDocumentDto } from "src/domain/interfaces/process-document-dto";
import { DocumentProcessingPublisherPort } from "src/application/ports/document-processing.publisher.port";

// Quota par défaut en octets (100 Mo)
const USER_QUOTA_LIMIT = process.env.USER_QUOTA_LIMIT ? parseInt(process.env.USER_QUOTA_LIMIT) : 100;
const DEFAULT_USER_QUOTA = USER_QUOTA_LIMIT * 1024 * 1024;

@CommandHandler(UploadDocumentCommand)
@Injectable()
export class UploadDocumentCommandHandler implements ICommandHandler<UploadDocumentCommand> {
    constructor(
        private readonly documentRepository: DocumentRepositoryPort,
        private readonly folderRepository: FolderRepositoryPort,
        private readonly storage: DocumentStoragePort,
        private readonly documentProcessingPublisher: DocumentProcessingPublisherPort,
    ) {}

    async execute(command: UploadDocumentCommand): Promise<DocumentVm> {
        const {
            folder_id,
            user_id,
            original_name,
            mime_type,
            size,
            buffer,
            image_processing_opts,
            video_processing_opts,
            audio_processing_opts,
            doc_processing_opts,
        } = command.payload;

        // 1. Vérifier que le dossier existe et appartient à l'utilisateur
        const folder = await this.folderRepository.findById(folder_id);
        if (!folder) {
            throw new NotFoundException('Le dossier n\'existe pas');
        }
        if (folder.user_id !== user_id) {
            throw new ForbiddenException('Le dossier n\'appartient pas à l\'utilisateur');
        }

        // 2. Vérifier le quota de l'utilisateur
        const currentUsage = await this.documentRepository.calculateUserTotalSize(user_id);
        const newTotalSize = currentUsage + size;
        
        if (newTotalSize > DEFAULT_USER_QUOTA) {
            const remainingSpace = Math.max(0, DEFAULT_USER_QUOTA - currentUsage);
            throw new BadRequestException(
                `Quota dépassé. Espace utilisé: ${this.formatBytes(currentUsage)}, ` +
                `Espace restant: ${this.formatBytes(remainingSpace)}, ` +
                `Taille du fichier: ${this.formatBytes(size)}`
            );
        }

        // 3. Générer un nouveau nom avec timestamp et UUID
        const timestamp = Date.now();
        const uuid = randomUUID();
        const extension = this.getFileExtension(original_name);
        const storedName = `${timestamp}_${uuid}${extension}`;
        
        const storagePath = `${storedName}`;

        // 5. Calculer le hash du fichier
        const fileHash = createHash('sha256').update(buffer).digest('hex');

        // 6. Créer l'entrée en BDD avec le statut STAGING
        const documentEntity: DocumentEntity = {
            folder_id,
            original_name,
            stored_name: storedName,
            path: storagePath,
            mime_type,
            size,
            upload_status: UploadStatus.STAGING,
            hash: fileHash,
            metadata: null,
            created_by: user_id,
        };

        const createdDocument = await this.documentRepository.create(documentEntity);

        try {
            await this.storage.upload(storagePath, buffer, mime_type);

            await this.processDocument(createdDocument, {
                image_processing_opts,
                video_processing_opts,
                audio_processing_opts,
                doc_processing_opts,
            });

            return new DocumentVm(createdDocument);
        } catch (error) {
            // En cas d'erreur, mettre à jour le statut en FAILED
            await this.documentRepository.update(createdDocument.id!, {
                upload_status: UploadStatus.FAILED,
                updated_by: user_id,
                metadata: {
                    error: error instanceof Error ? error.message : 'Erreur inconnue',
                },
            });

            throw new BadRequestException(
                `Erreur lors de l'upload du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
            );
        }
    }

    private async processDocument(
        document: DocumentEntity,
        options?: Omit<ProcessDocumentDto, "document_id">,
    ) {
        const payload: ProcessDocumentDto = {
            document_id: document.id as string,
            ...(options ?? {}),
        };

        await this.documentProcessingPublisher.documentUploaded(payload);
    }

    private getFileExtension(filename: string): string {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
            return '';
        }
        return filename.substring(lastDotIndex);
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
