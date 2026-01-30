import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ModerationStatus } from "src/commons/enums/moderation-status.enum";

export class TreatPendingSharingLinkDto {
    @ApiProperty()
    @IsEnum(ModerationStatus)
    status: ModerationStatus;

    @ApiProperty()
    @IsString()
    @IsOptional()
    reason?: string;
}