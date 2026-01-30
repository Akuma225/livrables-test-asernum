import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { SharingMode } from "generated/prisma/enums";
import { SharingAccess } from "generated/prisma/enums";

export class UpdateSharingLinkDto {
    @ApiProperty()
    @IsEnum(SharingMode)
    @IsOptional()
    mode?: SharingMode;

    @ApiProperty()
    @IsEnum(SharingAccess)
    @IsOptional()
    access?: SharingAccess;
}