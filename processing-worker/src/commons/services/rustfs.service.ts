import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    CopyObjectCommand,
  } from '@aws-sdk/client-s3';
  
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  import { Injectable, Logger } from '@nestjs/common';
  import { Readable } from 'stream';
  
  @Injectable()
  export class RustFSService {
    private readonly logger = new Logger(RustFSService.name);
    private s3: S3Client;
    private bucket = process.env.RUSTFS_BUCKET!;
    private productionBucket = process.env.RUSTFS_PRODUCTION_BUCKET!;
    private quarantineBucket = process.env.RUSTFS_QUARANTINE_BUCKET!;
    private failedBucket = process.env.RUSTFS_FAILED_BUCKET!;
  
    constructor() {
      this.s3 = new S3Client({
        endpoint: process.env.RUSTFS_ENDPOINT,
        region: process.env.RUSTFS_REGION,
        credentials: {
          accessKeyId: process.env.RUSTFS_ACCESS_KEY!,
          secretAccessKey: process.env.RUSTFS_SECRET_KEY!,
        },
        forcePathStyle: true
      });
    }
  
    async upload(
      key: string,
      buffer: Buffer,
      contentType: string,
    ) {
      return this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    }
  
    async getSignedUrl(key: string, expires = 3600) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expires },
      );
    }

    async getSignedUrlFromProduction(key: string, expires = 3600) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({
          Bucket: this.productionBucket,
          Key: key,
        }),
        { expiresIn: expires },
      );
    }

    async uploadToProduction(
      key: string,
      buffer: Buffer,
      contentType: string,
    ) {
      return this.s3.send(
        new PutObjectCommand({
          Bucket: this.productionBucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    }

    /**
     * Télécharge le buffer d'un fichier à partir de sa clé dans le bucket
     */
    async downloadBuffer(key: string): Promise<Buffer> {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`Le fichier ${key} est vide ou n'existe pas`);
      }

      return this.streamToBuffer(response.Body as Readable);
    }

    /**
     * Télécharge le buffer d'un fichier à partir de son URL signée
     */
    async downloadBufferFromUrl(url: string): Promise<Buffer> {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Échec du téléchargement: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    /**
     * Déplace un fichier vers le bucket de quarantaine
     */
    async moveToQuarantine(key: string): Promise<void> {
      const quarantineKey = `quarantine/${Date.now()}_${key}`;

      // Copier vers le bucket de quarantaine
      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.quarantineBucket,
          CopySource: `${this.bucket}/${this.encodeS3Key(key)}`,
          Key: quarantineKey,
        }),
      );

      this.logger.log(`Fichier copié vers quarantaine: ${quarantineKey}`);

      // Supprimer du bucket d'origine
      await this.delete(key);
      
      this.logger.log(`Fichier supprimé du bucket d'origine: ${key}`);
    }

    /**
     * Déplace un fichier vers le bucket des échecs (failed)
     * (copie vers failed puis suppression du staging)
     *
     * Retourne la clé dans le bucket failed pour traçabilité.
     */
    async moveToFailed(key: string): Promise<string> {
      const failedKey = `failed/${Date.now()}_${key}`;

      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.failedBucket,
          CopySource: `${this.bucket}/${this.encodeS3Key(key)}`,
          Key: failedKey,
        }),
      );

      this.logger.log(`Fichier copié vers failed: ${failedKey}`);

      await this.delete(key);
      this.logger.log(`Fichier supprimé du staging: ${key}`);

      return failedKey;
    }

    /**
     * Déplace un fichier du bucket de staging vers le bucket de production
     * (copie vers production puis suppression du staging)
     */
    async moveToProduction(key: string): Promise<void> {
      // Copier vers le bucket de production
      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.productionBucket,
          CopySource: `${this.bucket}/${this.encodeS3Key(key)}`,
          Key: key,
        }),
      );

      this.logger.log(`Fichier copié vers production: ${key}`);

      // Supprimer du bucket de staging
      await this.delete(key);

      this.logger.log(`Fichier supprimé du staging: ${key}`);
    }

    /**
     * Upload un fichier directement vers le bucket de quarantaine
     */
    async uploadToQuarantine(
      key: string,
      buffer: Buffer,
      contentType: string,
    ) {
      const quarantineKey = `quarantine/${Date.now()}_${key}`;
      
      return this.s3.send(
        new PutObjectCommand({
          Bucket: this.quarantineBucket,
          Key: quarantineKey,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    }
  
    async delete(key: string) {
      return this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    }

    /**
     * Convertit un stream en buffer
     */
    private async streamToBuffer(stream: Readable): Promise<Buffer> {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    }

    /**
     * Encode une clé S3 pour CopySource (préserve les '/')
     */
    private encodeS3Key(key: string): string {
      return encodeURIComponent(key).replace(/%2F/g, '/');
    }
  }
  