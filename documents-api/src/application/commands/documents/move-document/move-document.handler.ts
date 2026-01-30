import { NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { MoveDocumentCommand } from "./move-document.command";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentVm } from "src/application/viewmodels/document.vm";

@CommandHandler(MoveDocumentCommand)
export class MoveDocumentCommandHandler implements ICommandHandler<MoveDocumentCommand> {
    constructor(
        private readonly documentRepository: DocumentRepositoryPort,
        private readonly folderRepository: FolderRepositoryPort,
    ) {}

    async execute(command: MoveDocumentCommand): Promise<DocumentVm> {
        const { id, folder_id, user_id } = command.payload;

        const document = await this.documentRepository.findById(id);
        if (!document) {
            throw new NotFoundException("Le document n'existe pas");
        }

        const currentFolder = await this.folderRepository.findById(document.folder_id);
        if (!currentFolder) {
            throw new NotFoundException("Le dossier n'existe pas");
        }

        const targetFolder = await this.folderRepository.findById(folder_id);
        if (!targetFolder) {
            throw new NotFoundException("Le dossier cible n'existe pas");
        }

        const updated = await this.documentRepository.update(id, {
            folder_id,
            updated_by: user_id,
        });

        updated.folder = targetFolder;
        return new DocumentVm(updated);
    }
}

