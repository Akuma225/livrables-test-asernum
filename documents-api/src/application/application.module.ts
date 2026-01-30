import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { ControllerModule } from "./controllers/controller.module";
import { QueryModule } from "./queries/query.module";
import { CommandModule } from "./commands/command.module";

@Module({
    imports: [
        CqrsModule.forRoot(),
        ControllerModule,
        QueryModule,
        CommandModule,
    ],
    exports: [
        ControllerModule,
        QueryModule,
        CommandModule,
    ],
})
export class ApplicationModule {}
