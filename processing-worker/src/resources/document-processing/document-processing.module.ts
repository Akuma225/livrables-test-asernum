import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullmqModule } from 'src/commons/services/queue/bullmq/bullmq.module';
import { DocumentProcessingService } from './document-processing.service';
import { DocumentProcessingController } from './document-processing.controller';
import { RustFSService } from 'src/commons/services/rustfs.service';
import { AntivirusService } from 'src/commons/services/antivirus.service';
import { DocumentMetadataService } from 'src/commons/services/document-metadata.service';
import { ImageMetadataService } from 'src/commons/services/image-metadata.service';
import { VideoMetadataService } from 'src/commons/services/video-metadata.service';
import { DocumentFileMetadataService } from 'src/commons/services/document-file-metadata.service';
import { AudioMetadataService } from 'src/commons/services/audio-metadata.service';
import { ImageProcessingService } from 'src/commons/services/image-processing.service';
import { VideoProcessingService } from 'src/commons/services/video-processing.service';
import { AudioProcessingService } from 'src/commons/services/audio-processing.service';
import { FfmpegRunnerService } from 'src/commons/services/ffmpeg-runner.service';
import { DOCUMENT_PROCESSING_QUEUE } from './queue/document-processing.queue.constants';
import { DocumentProcessingQueueService } from './queue/document-processing.queue.service';
import { DocumentProcessingProcessor } from './queue/document-processing.processor';
import { DOCUMENTS_REPOSITORY } from './ports/documents-repository.port';
import { PrismaDocumentsRepository } from './infra/prisma-documents.repository';

@Module({
  imports: [
    BullmqModule,
    BullModule.registerQueue({
      name: DOCUMENT_PROCESSING_QUEUE,
    }),
  ],
  controllers: [DocumentProcessingController],
  providers: [
    {
      provide: DOCUMENTS_REPOSITORY,
      useClass: PrismaDocumentsRepository,
    },
    DocumentProcessingService,
    RustFSService,
    AntivirusService,
    DocumentMetadataService,
    ImageMetadataService,
    VideoMetadataService,
    AudioMetadataService,
    DocumentFileMetadataService,
    ImageProcessingService,
    VideoProcessingService,
    AudioProcessingService,
    FfmpegRunnerService,
    DocumentProcessingQueueService,
    DocumentProcessingProcessor,
  ],
  exports: [DocumentProcessingService, DocumentProcessingQueueService],
})
export class DocumentProcessingModule {}
