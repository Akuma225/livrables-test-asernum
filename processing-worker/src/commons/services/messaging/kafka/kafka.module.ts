import { Module } from '@nestjs/common';
import { DocumentProcessingModule } from 'src/resources/document-processing/document-processing.module';
import { KafkaConsumerService } from './kafka.consumer.service';

@Module({
  imports: [DocumentProcessingModule],
  providers: [KafkaConsumerService],
})
export class KafkaModule {}

