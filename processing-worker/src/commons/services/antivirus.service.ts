import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import NodeClam = require('clamscan');

export interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  scanTime: number;
}

@Injectable()
export class AntivirusService implements OnModuleInit {
  private readonly logger = new Logger(AntivirusService.name);
  private clamScan: NodeClam | null = null;
  private isInitialized = false;

  async onModuleInit() {
    await this.initClamAV();
  }

  /**
   * Initialise la connexion à ClamAV
   */
  private async initClamAV(): Promise<void> {
    try {
      this.clamScan = await new NodeClam().init({
        removeInfected: false,
        quarantineInfected: false,
        scanLog: null,
        debugMode: process.env.NODE_ENV === 'development',
        fileList: null,
        scanRecursively: true,
        clamdscan: {
          socket: process.env.CLAMAV_SOCKET || null,
          host: process.env.CLAMAV_HOST || '127.0.0.1',
          port: parseInt(process.env.CLAMAV_PORT || '3310', 10),
          timeout: parseInt(process.env.CLAMAV_TIMEOUT || '60000', 10),
          localFallback: true,
          path: process.env.CLAMAV_PATH || '/usr/bin/clamdscan',
          configFile: null,
          multiscan: true,
          reloadDb: false,
          active: true,
          bypassTest: false,
        },
        clamscan: {
          path: process.env.CLAMSCAN_PATH || '/usr/bin/clamscan',
          db: null,
          scanArchives: true,
          active: true,
        },
        preference: 'clamdscan',
      });

      this.isInitialized = true;
      this.logger.log('ClamAV initialisé avec succès');
    } catch (error) {
      this.logger.error('Échec de l\'initialisation de ClamAV', error);
      this.isInitialized = false;
    }
  }

  /**
   * Vérifie si ClamAV est disponible
   */
  isAvailable(): boolean {
    return this.isInitialized && this.clamScan !== null;
  }

  /**
   * Scanne un buffer de fichier pour détecter les virus
   */
  async scanBuffer(buffer: Buffer, filename?: string): Promise<ScanResult> {
    const startTime = Date.now();

    if (!this.isAvailable()) {
      this.logger.warn('ClamAV non disponible, scan ignoré');
      return {
        isInfected: false,
        viruses: [],
        scanTime: Date.now() - startTime,
      };
    }

    try {
      const readable = this.bufferToReadable(buffer);
      const result = await this.clamScan!.scanStream(readable);

      const scanTime = Date.now() - startTime;
      const scanResult: ScanResult = {
        isInfected: result.isInfected === true,
        viruses: result.viruses || [],
        scanTime,
      };

      if (scanResult.isInfected) {
        this.logger.warn(
          `Fichier infecté détecté${filename ? `: ${filename}` : ''} - Virus: ${scanResult.viruses.join(', ')}`,
        );
      } else {
        this.logger.debug(
          `Fichier sain${filename ? `: ${filename}` : ''} - Temps de scan: ${scanTime}ms`,
        );
      }

      return scanResult;
    } catch (error) {
      this.logger.error('Erreur lors du scan antivirus', error);
      throw new Error(`Échec du scan antivirus: ${error.message}`);
    }
  }

  /**
   * Convertit un buffer en stream Readable
   */
  private bufferToReadable(buffer: Buffer): NodeJS.ReadableStream {
    const { Readable } = require('stream');
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
  }

  /**
   * Récupère la version de ClamAV
   */
  async getVersion(): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.clamScan!.getVersion();
    } catch (error) {
      this.logger.error('Impossible de récupérer la version de ClamAV', error);
      return null;
    }
  }
}
