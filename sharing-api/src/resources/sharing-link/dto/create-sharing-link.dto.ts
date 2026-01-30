import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { SharingAccess, SharingMode } from "generated/prisma/enums";
import { Type } from "class-transformer";

export class CreateSharingLinkItemDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    document_id?: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    folder_id?: string;
}

export class CreateSharingLinkDto {
    @ApiProperty()
    @IsOptional()
    @IsString()
    recipient_id?: string;

    @ApiProperty()
    @IsEnum(SharingMode)
    @IsOptional()
    mode?: SharingMode;

    @ApiProperty()
    @IsEnum(SharingAccess)
    @IsOptional()
    access?: SharingAccess;

    @ApiProperty()
    @IsDateString()
    @IsOptional()
    expiration_date?: string;

    @ApiProperty({
        type: [CreateSharingLinkItemDto],
        isArray: true,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSharingLinkItemDto)
    @IsString({ each: true })
    items: CreateSharingLinkItemDto[];
}