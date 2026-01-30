import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class GetFolderFilterDto {
    @ApiPropertyOptional({ 
        description: 'Inclure les informations du dossier parent',
        type: Boolean,
        default: false
    })
    @IsOptional()
    @IsBoolean({ message: 'Le paramètre includeParent doit être un booléen' })
    @Transform(({ value }) => value === 'true' || value === true)
    includeParent?: boolean;

    @ApiPropertyOptional({ 
        description: 'Inclure les sous-dossiers dans le résultat',
        type: Boolean,
        default: false
    })
    @IsOptional()
    @IsBoolean({ message: 'Le paramètre includeSubFolders doit être un booléen' })
    @Transform(({ value }) => value === 'true' || value === true)
    includeSubFolders?: boolean;

    @ApiPropertyOptional({ 
        description: 'Inclure la taille totale du dossier (somme des tailles des documents)',
        type: Boolean,
        default: false
    })
    @IsOptional()
    @IsBoolean({ message: 'Le paramètre includeTotalSize doit être un booléen' })
    @Transform(({ value }) => value === 'true' || value === true)
    includeTotalSize?: boolean;

    @ApiPropertyOptional({
        description: 'Inclure les documents (uploadés et non supprimés) présents directement dans le dossier',
        type: Boolean,
        default: false
    })
    @IsOptional()
    @IsBoolean({ message: 'Le paramètre includeDocuments doit être un booléen' })
    @Transform(({ value }) => value === 'true' || value === true)
    includeDocuments?: boolean;
}
