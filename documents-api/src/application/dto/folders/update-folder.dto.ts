import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateFolderDto {
    @ApiPropertyOptional({ description: 'Nouveau nom du dossier' })
    @IsOptional()
    @IsString({ message: 'Le nom du dossier doit être une chaîne de caractères' })
    name?: string;

    @ApiPropertyOptional({ description: 'ID du nouveau dossier parent (null pour déplacer à la racine)' })
    @IsOptional()
    @IsUUID('4', { message: 'L\'ID du dossier parent doit être un UUID valide' })
    parent_id?: string | null;
}
