import { Injectable } from '@nestjs/common';
import { imageSize } from 'image-size';

type MinimalDocumentInfo = {
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
};

@Injectable()
export class ImageMetadataService {
  extract(document: MinimalDocumentInfo, buffer: Buffer): Record<string, any> {
    const info = imageSize(buffer);
    const width = info.width ?? null;
    const height = info.height ?? null;

    return {
      kind: 'image',
      mimeType: document.mime_type ?? null,
      originalName: document.original_name ?? null,
      size: document.size ?? null,
      imageType: info.type ?? null,
      width,
      height,
      orientation: width && height ? (width >= height ? 'landscape' : 'portrait') : null,
      aspectRatio: width && height ? width / height : null,
    };
  }
}

