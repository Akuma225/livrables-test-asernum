import { Injectable, Logger } from '@nestjs/common';
import * as path from 'node:path';
import { ImageMetadataService } from 'src/commons/services/image-metadata.service';
import { VideoMetadataService } from 'src/commons/services/video-metadata.service';
import { DocumentFileMetadataService } from 'src/commons/services/document-file-metadata.service';
import { AudioMetadataService } from 'src/commons/services/audio-metadata.service';

type MinimalDocumentInfo = {
  id: string;
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
};

@Injectable()
export class DocumentMetadataService {
  private readonly logger = new Logger(DocumentMetadataService.name);

  constructor(
    private readonly imageMetadataService: ImageMetadataService,
    private readonly videoMetadataService: VideoMetadataService,
    private readonly audioMetadataService: AudioMetadataService,
    private readonly documentFileMetadataService: DocumentFileMetadataService,
  ) {}

  private base(document: MinimalDocumentInfo) {
    return {
      extractedAt: new Date().toISOString(),
      mimeType: document.mime_type ?? null,
      originalName: document.original_name ?? null,
      size: document.size ?? null,
    };
  }

  async extract(document: MinimalDocumentInfo, buffer: Buffer): Promise<Record<string, any>> {
    const base = this.base(document);
    const ext = path.extname(document.original_name ?? '').toLowerCase();
    const mime = (document.mime_type ?? '').toLowerCase();

    try {
      if (mime.startsWith('image/')) {
        const extracted = this.imageMetadataService.extract(document, buffer);
        return { ...base, ...extracted };
      }

      if (mime.startsWith('video/')) {
        const extracted = await this.videoMetadataService.extract(document, buffer);
        return { ...base, ...extracted };
      }

      if (mime.startsWith('audio/')) {
        const extracted = await this.audioMetadataService.extract(document, buffer);
        return { ...base, ...extracted };
      }

      const isPdf = mime === 'application/pdf' || ext === '.pdf';
      if (isPdf) {
        const extracted = await this.documentFileMetadataService.extractPdf(document, buffer);
        return { ...base, ...extracted };
      }

      const isDocx =
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx';
      if (isDocx) {
        const extracted = await this.documentFileMetadataService.extractDocx(document, buffer);
        return { ...base, ...extracted };
      }

      const isDoc = mime === 'application/msword' || ext === '.doc';
      if (isDoc) {
        const extracted = this.documentFileMetadataService.extractDoc(document);
        return { ...base, ...extracted };
      }

      return {
        ...base,
        kind: 'unknown',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Extraction metadata impossible pour document ${document.id}: ${message}`);
      return {
        ...base,
        kind: 'unknown',
        error: message,
      };
    }
  }
}

