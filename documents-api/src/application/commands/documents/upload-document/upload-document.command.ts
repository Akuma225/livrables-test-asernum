import { CommandBase } from "src/common/cqrs/command-base";
import {
    AudioProcessingOptionsDto,
    DocProcessingOptionsDto,
    ImageProcessingOptionsDto,
    VideoProcessingOptionsDto,
} from "src/domain/interfaces/process-document-dto";

export interface UploadDocumentPayload {
    folder_id: string;
    user_id: string;
    original_name: string;
    mime_type: string;
    size: number;
    buffer: Buffer;
    image_processing_opts?: ImageProcessingOptionsDto;
    video_processing_opts?: VideoProcessingOptionsDto;
    audio_processing_opts?: AudioProcessingOptionsDto;
    doc_processing_opts?: DocProcessingOptionsDto;
}

export class UploadDocumentCommand extends CommandBase<UploadDocumentPayload> {
    readonly payload: UploadDocumentPayload;

    constructor(data: UploadDocumentPayload) {
        super();
        this.payload = data;
    }
}
