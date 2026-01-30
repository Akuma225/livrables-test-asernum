import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { RestoreDocumentCommand } from "./restore-document.command";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentStoragePort } from "src/domain/ports/document-storage.port";
import { DocumentVm } from "src/application/viewmodels/document.vm";

@CommandHandler(RestoreDocumentCommand)
export class RestoreDocumentCommandHandler implements ICommandHandler<RestoreDocumentCommand> {
    constructor(
        private readonly documentRepository: DocumentRepositoryPort,
        private readonly folderRepository: FolderRepositoryPort,
        private readonly storage: DocumentStoragePort,
    ) {}

    async execute(command: RestoreDocumentCommand): Promise<DocumentVm> {
        const { id, user_id } = command.payload;

        const document = await this.documentRepository.findByIdIncludingDeleted(id);
        if (!document) {
            throw new NotFoundException("Le document n'existe pas");
        }

        const folder = await this.folderRepository.findById(document.folder_id);
        if (!folder) {
            throw new NotFoundException("Le dossier n'existe pas");
        }

        if (!document.deleted_at) {
            throw new BadRequestException("Le document n'est pas dans la corbeille");
        }

        // Move trash -> production puis restauration DB
        await this.storage.moveTrashToProduction(document.path);

        const restored = await this.documentRepository.restore(id, user_id);
        restored.folder = folder;

        const url = await this.storage.getSignedUrlFromProduction(restored.path);
        return new DocumentVm(restored, { url });
    }
}

