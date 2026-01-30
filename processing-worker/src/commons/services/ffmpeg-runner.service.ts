import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

@Injectable()
export class FfmpegRunnerService {
  private readonly logger = new Logger(FfmpegRunnerService.name);

  private async getFfmpegPath(): Promise<string> {
    // Lazy import pour éviter de crasher au démarrage si pnpm n'a pas autorisé les builds
    const mod: any = await import('ffmpeg-static');
    const ffmpegPath = mod?.default ?? mod;
    if (!ffmpegPath || typeof ffmpegPath !== 'string') {
      throw new Error('ffmpeg-static introuvable (build non approuvé ?)');
    }
    return ffmpegPath;
  }

  async transcodeBuffer(params: {
    inputBuffer: Buffer;
    inputExt: string; // ".mp4"
    outputExt: string; // ".mp4"
    ffmpegArgs: string[]; // args entre input et output
  }): Promise<Buffer> {
    const ffmpegPath = await this.getFfmpegPath();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'processing-worker-'));

    const inPath = path.join(tmpDir, `in${params.inputExt}`);
    const outPath = path.join(tmpDir, `out${params.outputExt}`);

    try {
      await fs.writeFile(inPath, params.inputBuffer);

      const args = ['-y', '-i', inPath, ...params.ffmpegArgs, outPath];

      await new Promise<void>((resolve, reject) => {
        const p = spawn(ffmpegPath, args, { windowsHide: true });
        let stderr = '';
        p.stderr.on('data', (d) => (stderr += d.toString()));
        p.on('error', reject);
        p.on('close', (code) => {
          if (code === 0) return resolve();
          reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-2000)}`));
        });
      });

      return await fs.readFile(outPath);
    } finally {
      // Best-effort cleanup
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

