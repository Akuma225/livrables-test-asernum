import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetUserDocumentQuotaQuery } from "./get-user-document-quota.query";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";

export interface UserDocumentQuotaVm {
    limit_mb: number;
    limit_bytes: number;
    used_bytes: number;
    used_formatted: string;
    remaining_bytes: number;
    remaining_formatted: string;
    percent_used: number;
}

// Quota par défaut en Mo (100 Mo)
const USER_QUOTA_LIMIT = process.env.USER_QUOTA_LIMIT ? parseInt(process.env.USER_QUOTA_LIMIT) : 100;
const DEFAULT_USER_QUOTA = USER_QUOTA_LIMIT * 1024 * 1024;

@QueryHandler(GetUserDocumentQuotaQuery)
export class GetUserDocumentQuotaQueryHandler implements IQueryHandler<GetUserDocumentQuotaQuery> {
    constructor(private readonly documentRepository: DocumentRepositoryPort) {}

    async execute(query: GetUserDocumentQuotaQuery): Promise<UserDocumentQuotaVm> {
        const used = await this.documentRepository.calculateUserTotalSize(query.user_id);
        const remaining = Math.max(0, DEFAULT_USER_QUOTA - used);
        const percent = DEFAULT_USER_QUOTA === 0 ? 0 : Math.min(100, Math.round((used / DEFAULT_USER_QUOTA) * 10000) / 100);

        return {
            limit_mb: USER_QUOTA_LIMIT,
            limit_bytes: DEFAULT_USER_QUOTA,
            used_bytes: used,
            used_formatted: formatBytes(used),
            remaining_bytes: remaining,
            remaining_formatted: formatBytes(remaining),
            percent_used: percent,
        };
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

