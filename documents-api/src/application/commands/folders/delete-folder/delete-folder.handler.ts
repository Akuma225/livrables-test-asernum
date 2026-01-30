import { NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { DeleteFolderCommand } from "./delete-folder.command";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { DocumentStoragePort } from "src/domain/ports/document-storage.port";
import { UploadStatus } from "src/domain/entities/document.entity";
import { prisma } from "src/infrastructure/persistence/prisma/prisma";

@CommandHandler(DeleteFolderCommand)
export class DeleteFolderCommandHandler implements ICommandHandler<DeleteFolderCommand> {
    constructor(
        private readonly folderRepository: FolderRepositoryPort,
        private readonly documentRepository: DocumentRepositoryPort,
        private readonly storage: DocumentStoragePort,
    ) {}

    async execute(command: DeleteFolderCommand): Promise<{ message: string }> {
        const { id, user_id } = command.payload;

        // Vérifier que le dossier existe
        const existingFolder = await this.folderRepository.findByIdIncludingDeleted(id);
        if (!existingFolder) {
            throw new NotFoundException('Le dossier n\'existe pas');
        }

        // Suppression définitive: dossier + sous-dossiers + documents (sans corbeille)
        const folderIdsBottomUp = await this.getFolderTreeIdsBottomUp(id);
        const folderIds = folderIdsBottomUp.length > 0 ? folderIdsBottomUp : [id];

        // 1) Supprimer les fichiers dans RustFS (avant DB) pour éviter des orphelins en storage
        const documents = await this.documentRepository.findByFolderIdsIncludingDeleted(folderIds);
        for (const doc of documents) {
            const status = doc.upload_status ?? UploadStatus.STAGING;

            if (doc.deleted_at) {
                // Déjà passé en corbeille auparavant
                await this.storage.deleteFromTrash(doc.path);
                continue;
            }

            if (status === UploadStatus.UPLOADED) {
                await this.storage.deleteFromProduction(doc.path);
            } else {
                await this.storage.delete(doc.path);
            }
        }

        await this.folderRepository.hardDeleteTree(folderIdsBottomUp.length > 0 ? folderIdsBottomUp : folderIds);

        return { message: "Dossier supprimé définitivement" };
    }

    private async getFolderTreeIdsBottomUp(folderId: string): Promise<string[]> {
        const rows = await prisma.$queryRaw<Array<{ id: string; depth: number }>>`
            WITH RECURSIVE tree AS (
                SELECT id, parent_id, 0::int AS depth
                FROM folders
                WHERE id = ${folderId}
                UNION ALL
                SELECT f.id, f.parent_id, (tree.depth + 1)::int AS depth
                FROM folders f
                JOIN tree ON f.parent_id = tree.id
            )
            SELECT id, depth FROM tree ORDER BY depth DESC;
        `;

        return rows.map(r => r.id);
    }
}
