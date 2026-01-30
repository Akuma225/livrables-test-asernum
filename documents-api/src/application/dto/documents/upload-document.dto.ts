import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class CompressionOptionsDto {
    @ApiProperty({ description: "Niveau de compression (0-9)" })
    @Min(1)
    @Max(99)
    level: number;
}

class ImageProcessingOptionsDto {
    @ApiProperty({ required: false, type: CompressionOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CompressionOptionsDto)
    compression?: CompressionOptionsDto;
}

class VideoProcessingOptionsDto {
    @ApiProperty({ required: false, type: CompressionOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CompressionOptionsDto)
    compression?: CompressionOptionsDto;
}

class AudioProcessingOptionsDto {
    @ApiProperty({ required: false, type: CompressionOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CompressionOptionsDto)
    compression?: CompressionOptionsDto;
}

class DocProcessingOptionsDto {
    @ApiProperty({ required: false, description: "Options libres de traitement document" })
    @IsOptional()
    opts?: Record<string, any>;
}

export class UploadDocumentDto {
    @ApiProperty({ description: 'ID du dossier dans lequel uploader le document' })
    @IsNotEmpty({ message: 'L\'ID du dossier est requis' })
    @IsUUID('4', { message: 'L\'ID du dossier doit être un UUID valide' })
    folder_id: string;

    @ApiProperty({ required: false, type: ImageProcessingOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ImageProcessingOptionsDto)
    image_processing_opts?: ImageProcessingOptionsDto;

    @ApiProperty({ required: false, type: VideoProcessingOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => VideoProcessingOptionsDto)
    video_processing_opts?: VideoProcessingOptionsDto;

    @ApiProperty({ required: false, type: AudioProcessingOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => AudioProcessingOptionsDto)
    audio_processing_opts?: AudioProcessingOptionsDto;

    @ApiProperty({ required: false, type: DocProcessingOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DocProcessingOptionsDto)
    doc_processing_opts?: DocProcessingOptionsDto;
}
