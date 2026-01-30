import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DeleteDocumentCommand } from "./delete-document.command";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentStoragePort } from "src/domain/ports/document-storage.port";
import { UploadStatus } from "src/domain/entities/document.entity";
import { DocumentVm } from "src/application/viewmodels/document.vm";

@CommandHandler(DeleteDocumentCommand)
export class DeleteDocumentCommandHandler implements ICommandHandler<DeleteDocumentCommand> {
    constructor(
        private readonly documentRepository: DocumentRepositoryPort,
        private readonly folderRepository: FolderRepositoryPort,
        private readonly storage: DocumentStoragePort,
    ) {}

    async execute(command: DeleteDocumentCommand): Promise<DocumentVm | { message: string }> {
        const { id, user_id } = command.payload;

        const document = await this.documentRepository.findByIdIncludingDeleted(id);
        if (!document) {
            throw new NotFoundException("Le document n'existe pas");
        }

        const folder = await this.folderRepository.findById(document.folder_id);
        if (!folder) {
            throw new NotFoundException("Le dossier n'existe pas");
        }

        // Cas 1: document déjà soft deleted => suppression définitive + suppression dans trash
        if (document.deleted_at) {
            await this.storage.deleteFromTrash(document.path);
            await this.documentRepository.hardDelete(id);
            return { message: "Document supprimé définitivement" };
        }

        // Cas 2: document UPLOADED => soft delete + move production -> trash
        if ((document.upload_status ?? UploadStatus.STAGING) !== UploadStatus.UPLOADED) {
            throw new BadRequestException(
                "Suppression autorisée uniquement pour un document au statut UPLOADED (ou déjà dans la corbeille)"
            );
        }

        const softDeleted = await this.documentRepository.softDelete(id, user_id);

        try {
            await this.storage.moveProductionToTrash(document.path);
        } catch (e) {
            // rollback en base si la partie stockage échoue
            await this.documentRepository.restore(id, user_id);
            throw e;
        }

        softDeleted.folder = folder;
        return new DocumentVm(softDeleted);
    }
}

