import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class SearchDto {
    @ApiProperty({ description: 'Texte recherché', example: 'facture' })
    @IsString({ message: 'Le paramètre q doit être une chaîne de caractères' })
    q: string;

    @ApiProperty({ description: 'Type de recherche', enum: ['all', 'folders', 'documents'], default: 'all', required: false })
    @IsIn(['all', 'folders', 'documents'], { message: 'Le paramètre type doit être all, folders ou documents' })
    type?: 'all' | 'folders' | 'documents';
}

