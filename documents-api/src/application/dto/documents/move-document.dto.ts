import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class MoveDocumentDto {
    @ApiProperty({ description: 'ID du dossier cible dans lequel déplacer le document' })
    @IsUUID('4', { message: 'Le paramètre folder_id doit être un UUID valide' })
    folder_id: string;
}

