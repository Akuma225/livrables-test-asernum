import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateFolderDto {
    @ApiProperty({ description: 'Nom du dossier' })
    @IsNotEmpty({ message: 'Le nom du dossier est requis' })
    @IsString({ message: 'Le nom du dossier doit être une chaîne de caractères' })
    name: string;

    @ApiPropertyOptional({ description: 'ID du dossier parent (null pour un dossier racine)' })
    @IsOptional()
    @IsUUID('4', { message: 'L\'ID du dossier parent doit être un UUID valide' })
    parent_id?: string | null;
}
