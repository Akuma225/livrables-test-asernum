import { Module } from "@nestjs/common";
import { RustFSService } from "./rustfs.service";
import { DocumentStoragePort } from "src/domain/ports/document-storage.port";

@Module({
    providers: [
        RustFSService,
        {
            provide: DocumentStoragePort,
            useExisting: RustFSService,
        },
    ],
    exports: [RustFSService, DocumentStoragePort],
})
export class StorageModule {}
