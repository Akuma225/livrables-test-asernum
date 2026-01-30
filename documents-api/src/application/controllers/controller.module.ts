import { QueryModule } from "../queries/query.module";
import { CommandModule } from "../commands/command.module";
import { UserController } from "./user.controller";
import { FolderController } from "./folder.controller";
import { DocumentController } from "./document.controller";
import { SearchController } from "./search.controller";
import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../security/authorization.module";

@Module({
    imports: [
        QueryModule,
        CommandModule,
        AuthorizationModule,
    ],
    controllers: [
        UserController,
        FolderController,
        DocumentController,
        SearchController,
    ],
})
export class ControllerModule {}