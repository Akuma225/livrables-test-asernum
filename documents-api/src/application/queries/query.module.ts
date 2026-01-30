import { Module } from "@nestjs/common";
import { FindUserByIdQueryHandler } from "./users/find-user-by-id/find-user-by-id.handler";
import { FindFolderByIdQueryHandler } from "./folders/find-folder-by-id/find-folder-by-id.handler";
import { FindFoldersByUserQueryHandler } from "./folders/find-folders-by-user/find-folders-by-user.handler";
import { FindDocumentByIdQueryHandler } from "./documents/find-document-by-id/find-document-by-id.handler";
import { GetUserDocumentQuotaQueryHandler } from "./documents/get-user-document-quota/get-user-document-quota.handler";
import { DownloadDocumentQueryHandler } from "./documents/download-document/download-document.handler";
import { SearchQueryHandler } from "./search/search.handler";

@Module({
    providers: [
        FindUserByIdQueryHandler,
        FindFolderByIdQueryHandler,
        FindFoldersByUserQueryHandler,
        FindDocumentByIdQueryHandler,
        GetUserDocumentQuotaQueryHandler,
        DownloadDocumentQueryHandler,
        SearchQueryHandler,
    ],
    exports: [
        FindUserByIdQueryHandler,
        FindFolderByIdQueryHandler,
        FindFoldersByUserQueryHandler,
        FindDocumentByIdQueryHandler,
        GetUserDocumentQuotaQueryHandler,
        DownloadDocumentQueryHandler,
        SearchQueryHandler,
    ],
})
export class QueryModule {}