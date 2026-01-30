import { Global, Module } from "@nestjs/common";
import { RepositoryModule } from "./persistence/repositories/repository.module";
import { SecurityModule } from "./security/security.module";
import { StorageModule } from "./services/storage/storage.module";
import { KafkaModule } from "./messaging/kafka/kafka.module";

@Global()
@Module({
    imports: [
        RepositoryModule,
        SecurityModule,
        StorageModule,
        KafkaModule,
    ],
    exports: [
        RepositoryModule,
        SecurityModule,
        StorageModule,
        KafkaModule,
    ],
})
export class InfrastructureModule {}
