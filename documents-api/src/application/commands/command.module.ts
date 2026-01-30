import { Module } from "@nestjs/common";
import { CreateFolderCommandHandler } from "./folders/create-folder/create-folder.handler";
import { UpdateFolderCommandHandler } from "./folders/update-folder/update-folder.handler";
import { DeleteFolderCommandHandler } from "./folders/delete-folder/delete-folder.handler";
import { UploadDocumentCommandHandler } from "./documents/upload-document/upload-document.handler";
import { DeleteDocumentCommandHandler } from "./documents/delete-document/delete-document.handler";
import { RestoreDocumentCommandHandler } from "./documents/restore-document/restore-document.handler";
import { MoveDocumentCommandHandler } from "./documents/move-document/move-document.handler";

@Module({
    providers: [
        CreateFolderCommandHandler,
        UpdateFolderCommandHandler,
        DeleteFolderCommandHandler,
        UploadDocumentCommandHandler,
        DeleteDocumentCommandHandler,
        RestoreDocumentCommandHandler,
        MoveDocumentCommandHandler,
    ],
    exports: [
        CreateFolderCommandHandler,
        UpdateFolderCommandHandler,
        DeleteFolderCommandHandler,
        UploadDocumentCommandHandler,
        DeleteDocumentCommandHandler,
        RestoreDocumentCommandHandler,
        MoveDocumentCommandHandler,
    ],
})
export class CommandModule {}
