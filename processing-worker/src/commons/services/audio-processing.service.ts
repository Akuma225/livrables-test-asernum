import { Injectable, Logger } from '@nestjs/common';
import { FfmpegRunnerService } from 'src/commons/services/ffmpeg-runner.service';

@Injectable()
export class AudioProcessingService {
  private readonly logger = new Logger(AudioProcessingService.name);

  constructor(private readonly ffmpeg: FfmpegRunnerService) {}

  private clampQuality(level: number): number {
    // level attendu: 1..99 (99 = meilleure qualité)
    if (!Number.isFinite(level)) return 80;
    return Math.max(1, Math.min(99, Math.trunc(level)));
  }

  private bitrateKbpsFromQuality(qualityLevel: number): number {
    // Plus le bitrate est élevé, meilleure est la qualité.
    // Mapping simple: 48kbps (bas) -> 192kbps (haut)
    const q = this.clampQuality(qualityLevel);
    const t = (q - 1) / 98; // 0..1
    const bitrate = Math.round(48 + t * (192 - 48)); // 99->192, 1->48
    return Math.max(48, Math.min(192, bitrate));
  }

  async compress(params: {
    buffer: Buffer;
    ext: string; // ".mp3", ".m4a", ".ogg"...
    level: number; // 1-99 (99 = meilleure qualité)
  }): Promise<{ buffer: Buffer; processing: Record<string, any> }> {
    const bitrateKbps = this.bitrateKbpsFromQuality(params.level);

    // On ne tente que sur quelques conteneurs connus, sinon no-op
    const ext = params.ext.toLowerCase();

    try {
      if (ext === '.mp3') {
        const out = await this.ffmpeg.transcodeBuffer({
          inputBuffer: params.buffer,
          inputExt: ext,
          outputExt: ext,
          ffmpegArgs: ['-vn', '-c:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`],
        });
        return { buffer: out, processing: { compression: { level: params.level, bitrateKbps } } };
      }

      if (ext === '.m4a' || ext === '.aac') {
        const out = await this.ffmpeg.transcodeBuffer({
          inputBuffer: params.buffer,
          inputExt: ext,
          outputExt: ext === '.aac' ? '.aac' : '.m4a',
          ffmpegArgs: ['-vn', '-c:a', 'aac', '-b:a', `${bitrateKbps}k`],
        });
        return { buffer: out, processing: { compression: { level: params.level, bitrateKbps } } };
      }

      if (ext === '.ogg' || ext === '.opus') {
        const out = await this.ffmpeg.transcodeBuffer({
          inputBuffer: params.buffer,
          inputExt: ext,
          outputExt: ext,
          ffmpegArgs: ['-vn', '-c:a', 'libopus', '-b:a', `${bitrateKbps}k`],
        });
        return { buffer: out, processing: { compression: { level: params.level, bitrateKbps } } };
      }

      return { buffer: params.buffer, processing: { compression: { skipped: true, reason: 'unsupported_ext' } } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Compression audio ignorée: ${msg}`);
      return { buffer: params.buffer, processing: { compression: { skipped: true, error: msg } } };
    }
  }
}

