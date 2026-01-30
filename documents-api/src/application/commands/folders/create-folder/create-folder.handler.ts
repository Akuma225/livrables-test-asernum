import { BadRequestException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateFolderCommand } from "./create-folder.command";
import { FolderEntity } from "src/domain/entities/folder.entity";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { prisma } from "src/infrastructure/persistence/prisma/prisma";

@CommandHandler(CreateFolderCommand)
export class CreateFolderCommandHandler implements ICommandHandler<CreateFolderCommand> {
    constructor(private readonly folderRepository: FolderRepositoryPort) {}

    async execute(command: CreateFolderCommand): Promise<FolderEntity> {
        const { name, parent_id, user_id } = command.payload;
        const desiredName = (name ?? "").trim();
        if (!desiredName) {
            throw new BadRequestException("Le nom du dossier est requis");
        }

        // Vérifier que le dossier parent existe et appartient à l'utilisateur
        if (parent_id) {
            const parentFolder = await this.folderRepository.findById(parent_id);
            if (!parentFolder) {
                throw new BadRequestException('Le dossier parent n\'existe pas');
            }
            if (parentFolder.user_id !== user_id) {
                throw new BadRequestException('Le dossier parent n\'appartient pas à l\'utilisateur');
            }
        }

        const uniqueName = await this.buildUniqueSiblingName(user_id, parent_id ?? null, desiredName);

        const folder: FolderEntity = {
            name: uniqueName,
            parent_id: parent_id ?? null,
            user_id,
            created_by: user_id,
        };

        return await this.folderRepository.create(folder);
    }

    private async buildUniqueSiblingName(userId: string, parentId: string | null, desiredName: string): Promise<string> {
        const siblings = await prisma.folders.findMany({
            where: {
                user_id: userId,
                parent_id: parentId,
                deleted_at: null,
                name: {
                    startsWith: desiredName,
                    mode: "insensitive",
                },
            },
            select: { name: true },
        });

        // Exemple attendu: "Nom", "Nom (1)", "Nom (2)" => prochain: "Nom (3)"
        const used = new Set<number>();
        const base = desiredName;
        const baseLower = base.toLowerCase();
        const re = new RegExp(`^${this.escapeRegExp(base)} \\((\\d+)\\)$`, "i");

        for (const s of siblings) {
            const n = (s.name ?? "").trim();
            if (!n) continue;

            if (n.toLowerCase() === baseLower) {
                used.add(0);
                continue;
            }

            const m = n.match(re);
            if (!m) continue;

            const parsed = Number(m[1]);
            if (Number.isInteger(parsed) && parsed > 0) {
                used.add(parsed);
            }
        }

        if (!used.has(0)) return base;

        let i = 1;
        while (used.has(i)) i++;
        return `${base} (${i})`;
    }

    private escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
