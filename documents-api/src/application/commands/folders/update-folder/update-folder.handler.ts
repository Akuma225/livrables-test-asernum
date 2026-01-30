import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UpdateFolderCommand } from "./update-folder.command";
import { FolderEntity } from "src/domain/entities/folder.entity";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { prisma } from "src/infrastructure/persistence/prisma/prisma";

@CommandHandler(UpdateFolderCommand)
export class UpdateFolderCommandHandler implements ICommandHandler<UpdateFolderCommand> {
    constructor(private readonly folderRepository: FolderRepositoryPort) {}

    async execute(command: UpdateFolderCommand): Promise<FolderEntity> {
        const { id, name, parent_id, user_id } = command.payload;

        // Vérifier que le dossier existe
        const existingFolder = await this.folderRepository.findById(id);
        if (!existingFolder) {
            throw new NotFoundException('Le dossier n\'existe pas');
        }

        // Vérifier que le nouveau dossier parent existe et appartient à l'utilisateur
        if (parent_id !== undefined && parent_id !== null) {
            // Empêcher de définir un dossier comme son propre parent
            if (parent_id === id) {
                throw new BadRequestException('Un dossier ne peut pas être son propre parent');
            }

            // Empêcher les cycles: interdire de déplacer un dossier dans l'un de ses descendants
            // (on vérifie si le dossier courant est un ancêtre du nouveau parent)
            const parentAncestors = await this.getFolderAncestorIds(parent_id);
            if (parentAncestors.includes(id)) {
                throw new BadRequestException('Un dossier ne peut pas être déplacé dans l\'un de ses sous-dossiers');
            }

            const parentFolder = await this.folderRepository.findById(parent_id);
            if (!parentFolder) {
                throw new BadRequestException('Le dossier parent n\'existe pas');
            }
        }

        const updateData: Partial<FolderEntity> = {
            updated_by: user_id,
        };

        if (name !== undefined) {
            updateData.name = name;
        }

        if (parent_id !== undefined) {
            updateData.parent_id = parent_id;
        }

        return await this.folderRepository.update(id, updateData);
    }

    private async getFolderAncestorIds(folderId: string): Promise<string[]> {
        const rows = await prisma.$queryRaw<Array<{ id: string }>>`
            WITH RECURSIVE ancestors AS (
                SELECT id, parent_id
                FROM folders
                WHERE id = ${folderId} AND deleted_at IS NULL
                UNION ALL
                SELECT f.id, f.parent_id
                FROM folders f
                JOIN ancestors a ON f.id = a.parent_id
                WHERE f.deleted_at IS NULL
            )
            SELECT id FROM ancestors;
        `;

        return Array.from(new Set(rows.map(r => r.id)));
    }
}
