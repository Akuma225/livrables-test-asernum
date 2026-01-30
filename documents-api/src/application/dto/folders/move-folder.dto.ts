import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class MoveFolderDto {
    @ApiProperty({ description: 'ID du dossier cible (parent) dans lequel déplacer ce dossier' })
    @IsUUID('4', { message: 'Le paramètre parent_id doit être un UUID valide' })
    parent_id: string;
}

