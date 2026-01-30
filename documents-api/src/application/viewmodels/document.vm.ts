import { ApiResponseProperty } from "@nestjs/swagger";
import { DocumentEntity, UploadStatus } from "src/domain/entities/document.entity";
import { FolderVm } from "./folder.vm";

export class DocumentVm {
    @ApiResponseProperty()
    id: string;
    
    @ApiResponseProperty()
    folder_id: string;

    @ApiResponseProperty({ type: FolderVm })
    folder?: FolderVm;
    
    @ApiResponseProperty()
    original_name: string;
    
    @ApiResponseProperty()
    stored_name: string;
    
    @ApiResponseProperty()
    path: string;
    
    @ApiResponseProperty()
    mime_type: string;
    
    @ApiResponseProperty()
    size: number;
    
    @ApiResponseProperty()
    size_formatted: string;
    
    @ApiResponseProperty()
    upload_status: UploadStatus;

    @ApiResponseProperty()
    hash: string;

    @ApiResponseProperty()
    metadata?: Record<string, any> | null;

    @ApiResponseProperty()
    url?: string;

    @ApiResponseProperty()
    created_at?: Date;

    @ApiResponseProperty()
    updated_at?: Date;

    @ApiResponseProperty()
    deleted_at?: Date;

    constructor(data: DocumentEntity, options?: { url?: string }) {
        this.id = data.id!;
        this.folder_id = data.folder_id;
        this.folder = data.folder ? new FolderVm(data.folder) : undefined;
        this.original_name = data.original_name;
        this.stored_name = data.stored_name;
        this.path = data.path;
        this.mime_type = data.mime_type;
        this.size = data.size;
        this.size_formatted = DocumentVm.formatBytes(data.size);
        this.upload_status = data.upload_status ?? UploadStatus.STAGING;
        this.hash = data.hash;
        this.metadata = data.metadata;
        this.url = options?.url;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at;
    }

    private static formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
