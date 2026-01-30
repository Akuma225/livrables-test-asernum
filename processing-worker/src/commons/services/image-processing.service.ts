import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  private clampQuality(level: number): number {
    // level attendu: 1..99 (99 = meilleure qualité)
    if (!Number.isFinite(level)) return 80;
    return Math.max(1, Math.min(99, Math.trunc(level)));
  }

  private pngCompressionLevelFromQuality(qualityLevel: number): number {
    // sharp.png({ compressionLevel }) attend 0..9, où 9 = compression max.
    // Ici: 99 = meilleure qualité => compressionLevel bas
    const q = this.clampQuality(qualityLevel);
    const t = (q - 1) / 98; // 0..1
    const compression = Math.round(9 - t * 9); // 99->0, 1->9
    return Math.max(0, Math.min(9, compression));
  }

  async compress(params: {
    buffer: Buffer;
    mimeType: string;
    level: number; // 1-99 (99 = meilleure qualité)
  }): Promise<{ buffer: Buffer; processing: Record<string, any> }> {
    try {
      // Lazy import (sharp peut manquer si build non approuvé)
      const sharpMod: any = await import('sharp');
      const sharp = sharpMod?.default ?? sharpMod;

      const quality = this.clampQuality(params.level);

      if (params.mimeType === 'image/jpeg' || params.mimeType === 'image/jpg') {
        const out = await sharp(params.buffer).jpeg({ quality, mozjpeg: true }).toBuffer();
        return { buffer: out, processing: { compression: { level: params.level, quality } } };
      }

      if (params.mimeType === 'image/webp') {
        const out = await sharp(params.buffer).webp({ quality }).toBuffer();
        return { buffer: out, processing: { compression: { level: params.level, quality } } };
      }

      if (params.mimeType === 'image/png') {
        // compressionLevel: 0-9
        const compressionLevel = this.pngCompressionLevelFromQuality(params.level);
        const out = await sharp(params.buffer).png({ compressionLevel }).toBuffer();
        return { buffer: out, processing: { compression: { level: params.level, compressionLevel } } };
      }

      // Autres formats: pas de traitement pour l’instant
      return { buffer: params.buffer, processing: { compression: { skipped: true, reason: 'unsupported_mime' } } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Compression image ignorée: ${msg}`);
      return { buffer: params.buffer, processing: { compression: { skipped: true, error: msg } } };
    }
  }
}

