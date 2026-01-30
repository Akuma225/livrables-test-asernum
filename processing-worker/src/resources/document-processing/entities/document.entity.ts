import { UploadStatus } from "../../../../generated/prisma/client";

export class DocumentEntity {
    id: string;
    folder_id: string;
    original_name: string;
    stored_name: string;
    path: string;
    mime_type: string;
    size: number;
    upload_status: UploadStatus;
    hash: string;
    metadata: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}