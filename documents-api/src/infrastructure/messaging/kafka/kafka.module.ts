import { KafkaProducer } from "./kafka.producer";
import { Module } from "@nestjs/common";
import { KafkaDocumentProcessingPublisher } from "./document-processing.publisher";
import { DocumentProcessingPublisherPort } from "src/application/ports/document-processing.publisher.port";

@Module({
    providers: [
        KafkaProducer,
        KafkaDocumentProcessingPublisher,
        {
            provide: DocumentProcessingPublisherPort,
            useExisting: KafkaDocumentProcessingPublisher,
        },
    ],
    exports: [KafkaProducer, KafkaDocumentProcessingPublisher, DocumentProcessingPublisherPort],
})
export class KafkaModule {}