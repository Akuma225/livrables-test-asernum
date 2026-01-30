import { AuditEntity } from "./audit.entity";
import { FolderEntity } from "./folder.entity";

export enum UploadStatus {
    STAGING = 'STAGING',
    PROCESSING = 'PROCESSING',
    UPLOADED = 'UPLOADED',
    FAILED = 'FAILED',
    IN_QUARANTINE = 'IN_QUARANTINE',
}

export class DocumentEntity extends AuditEntity {
    id?: string | undefined;
    folder_id: string;
    folder?: FolderEntity | undefined;
    original_name: string;
    stored_name: string;
    path: string;
    mime_type: string;
    size: number;
    upload_status?: UploadStatus | undefined;
    hash: string;
    metadata?: Record<string, any> | null | undefined;
}
