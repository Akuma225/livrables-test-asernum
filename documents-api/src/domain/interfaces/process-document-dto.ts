export interface CompressionOptionsDto {
    /** Niveau de compression (0-9) */
    level: number;
}

export interface ImageProcessingOptionsDto {
    compression?: CompressionOptionsDto;
}

export interface VideoProcessingOptionsDto {
    compression?: CompressionOptionsDto;
}

export interface AudioProcessingOptionsDto {
    compression?: CompressionOptionsDto;
}

export interface DocProcessingOptionsDto {
    /** Options de traitement document (à venir) */
    opts?: Record<string, any>;
}

export interface ProcessDocumentDto {
    document_id: string;

    image_processing_opts?: ImageProcessingOptionsDto;
    video_processing_opts?: VideoProcessingOptionsDto;
    audio_processing_opts?: AudioProcessingOptionsDto;
    doc_processing_opts?: DocProcessingOptionsDto;
}