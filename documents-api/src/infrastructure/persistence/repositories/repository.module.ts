import { UserSessionRepository } from "./user-session.repository";
import { UserRepository } from "./user.repository";
import { FolderRepository } from "./folder.repository";
import { DocumentRepository } from "./document.repository";
import { Module } from "@nestjs/common";
import { DocumentRepositoryPort } from "src/domain/ports/document-repository.port";
import { FolderRepositoryPort } from "src/domain/ports/folder-repository.port";
import { UserRepositoryPort } from "src/domain/ports/user-repository.port";
import { UserSessionRepositoryPort } from "src/domain/ports/user-session-repository.port";

@Module({
    providers: [
        UserRepository,
        UserSessionRepository,
        FolderRepository,
        DocumentRepository,
        { provide: DocumentRepositoryPort, useExisting: DocumentRepository },
        { provide: FolderRepositoryPort, useExisting: FolderRepository },
        { provide: UserRepositoryPort, useExisting: UserRepository },
        { provide: UserSessionRepositoryPort, useExisting: UserSessionRepository },
    ],
    exports: [
        UserRepository,
        UserSessionRepository,
        FolderRepository,
        DocumentRepository,
        DocumentRepositoryPort,
        FolderRepositoryPort,
        UserRepositoryPort,
        UserSessionRepositoryPort,
    ],
})
export class RepositoryModule {}