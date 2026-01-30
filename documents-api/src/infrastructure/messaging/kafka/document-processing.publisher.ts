import { Injectable } from "@nestjs/common";
import { DocumentProcessingPublisherPort } from "src/application/ports/document-processing.publisher.port";
import { ProcessDocumentDto } from "src/domain/interfaces/process-document-dto";
import { KafkaProducer } from "./kafka.producer";
import { KAFKA_TOPICS } from "./topics";

@Injectable()
export class KafkaDocumentProcessingPublisher implements DocumentProcessingPublisherPort {
    constructor(private readonly kafkaProducer: KafkaProducer) {}

    async documentUploaded(payload: ProcessDocumentDto): Promise<void> {
        await this.kafkaProducer.emit(KAFKA_TOPICS.DOCUMENT_UPLOADED, payload);
    }
}
