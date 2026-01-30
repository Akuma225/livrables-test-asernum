import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class CompressionOptionsDto {
    @ApiProperty({
        description: "Qualité de sortie (1-99). 99 = meilleure qualité, 1 = plus faible qualité.",
        minimum: 1,
        maximum: 99,
        example: 80
    })
    @IsInt()
    @Min(1)
    @Max(99)
    level: number;
}

export class ImageProcessingOptionsDto {
    @ApiProperty({ required: false, type: CompressionOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CompressionOptionsDto)
    compression?: CompressionOptionsDto;
}

export class VideoProcessingOptionsDto {
    @ApiProperty({ required: false, type: CompressionOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CompressionOptionsDto)
    compression?: CompressionOptionsDto;
}

export class AudioProcessingOptionsDto {
    @ApiProperty({ required: false, type: CompressionOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CompressionOptionsDto)
    compression?: CompressionOptionsDto;
}

export class DocProcessingOptionsDto {
    // Placeholder pour des traitements futurs (PDF/Word, etc.)
    @ApiProperty({ required: false, description: "Options de traitement document (à venir)", type: Object })
    @IsOptional()
    @IsObject()
    opts?: Record<string, any>;
}

export class ProcessDocumentDto {
    @ApiProperty()
    @IsString()
    document_id: string;

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

    // Tu n'avais pas cité audio_processing_opts, mais on l'ajoute pour supporter le cas audio.
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