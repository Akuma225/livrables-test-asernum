import { ProcessDocumentDto } from "src/domain/interfaces/process-document-dto";

export abstract class DocumentProcessingPublisherPort {
    abstract documentUploaded(payload: ProcessDocumentDto): Promise<void>;
}
