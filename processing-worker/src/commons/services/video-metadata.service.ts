import { Injectable } from '@nestjs/common';
import * as mm from 'music-metadata';

type MinimalDocumentInfo = {
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
};

@Injectable()
export class VideoMetadataService {
  async extract(document: MinimalDocumentInfo, buffer: Buffer): Promise<Record<string, any>> {
    const parsed = await mm.parseBuffer(
      buffer,
      { mimeType: document.mime_type ?? undefined, size: document.size ?? undefined },
      { duration: true },
    );

    return {
      kind: 'video',
      mimeType: document.mime_type ?? null,
      originalName: document.original_name ?? null,
      size: document.size ?? null,
      durationSeconds: typeof parsed.format.duration === 'number' ? parsed.format.duration : null,
      container: parsed.format.container ?? null,
      codec: parsed.format.codec ?? null,
      bitrate: typeof parsed.format.bitrate === 'number' ? parsed.format.bitrate : null,
      sampleRate: typeof parsed.format.sampleRate === 'number' ? parsed.format.sampleRate : null,
      numberOfChannels: typeof parsed.format.numberOfChannels === 'number' ? parsed.format.numberOfChannels : null,
    };
  }
}

