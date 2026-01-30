import { Injectable, Logger } from '@nestjs/common';
import { FfmpegRunnerService } from 'src/commons/services/ffmpeg-runner.service';

@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);

  constructor(private readonly ffmpeg: FfmpegRunnerService) {}

  private clampQuality(level: number): number {
    // level attendu: 1..99 (99 = meilleure qualité)
    if (!Number.isFinite(level)) return 80;
    return Math.max(1, Math.min(99, Math.trunc(level)));
  }

  private crfFromQuality(qualityLevel: number): number {
    // CRF: plus bas = meilleure qualité.
    // Mapping simple: 18 (haut) -> 36 (forte compression / faible qualité)
    const q = this.clampQuality(qualityLevel);
    const t = (q - 1) / 98; // 0..1
    const crf = Math.round(36 - t * (36 - 18)); // 99->18, 1->36
    return Math.max(18, Math.min(36, crf));
  }

  async compress(params: {
    buffer: Buffer;
    ext: string; // ".mp4", ".webm"
    level: number; // 1-99 (99 = meilleure qualité)
  }): Promise<{ buffer: Buffer; processing: Record<string, any> }> {
    const ext = params.ext.toLowerCase();

    const crf = this.crfFromQuality(params.level);

    try {
      if (ext === '.mp4') {
        const out = await this.ffmpeg.transcodeBuffer({
          inputBuffer: params.buffer,
          inputExt: ext,
          outputExt: ext,
          ffmpegArgs: [
            '-c:v',
            'libx264',
            '-preset',
            'medium',
            '-crf',
            String(crf),
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-movflags',
            '+faststart',
          ],
        });
        return { buffer: out, processing: { compression: { level: params.level, crf } } };
      }

      if (ext === '.webm') {
        const out = await this.ffmpeg.transcodeBuffer({
          inputBuffer: params.buffer,
          inputExt: ext,
          outputExt: ext,
          ffmpegArgs: ['-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-c:a', 'libopus', '-b:a', '96k'],
        });
        return { buffer: out, processing: { compression: { level: params.level, crf } } };
      }

      return { buffer: params.buffer, processing: { compression: { skipped: true, reason: 'unsupported_ext' } } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Compression vidéo ignorée: ${msg}`);
      return { buffer: params.buffer, processing: { compression: { skipped: true, error: msg } } };
    }
  }
}

