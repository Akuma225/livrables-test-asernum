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
import { DocumentStoragePort } from 'src/domain/ports/document-storage.port';
  
  @Injectable()
  export class RustFSService extends DocumentStoragePort {
    private readonly logger = new Logger(RustFSService.name);
    private s3: S3Client;
    private bucket = process.env.RUSTFS_BUCKET!;
    private productionBucket = process.env.RUSTFS_PRODUCTION_BUCKET!;
    private trashBucket = process.env.RUSTFS_TRASH_BUCKET!;
  
    constructor() {
      super();
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

    async getSignedUrlFromTrash(key: string, expires = 3600) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({
          Bucket: this.trashBucket,
          Key: key,
        }),
        { expiresIn: expires },
      );
    }
  
    async downloadFromProduction(key: string): Promise<{ buffer: Buffer; contentType?: string }> {
      const result = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.productionBucket,
          Key: key,
        }),
      );

      const body = result.Body;
      if (!body) {
        return { buffer: Buffer.alloc(0), contentType: result.ContentType };
      }

      const buffer = await this.toBuffer(body);
      return { buffer, contentType: result.ContentType };
    }

    async delete(key: string) {
      return this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    }

    async deleteFromProduction(key: string) {
      return this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.productionBucket,
          Key: key,
        }),
      );
    }

    async deleteFromTrash(key: string) {
      return this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.trashBucket,
          Key: key,
        }),
      );
    }

    async moveProductionToTrash(key: string): Promise<void> {
      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.trashBucket,
          CopySource: `${this.productionBucket}/${this.encodeS3Key(key)}`,
          Key: key,
        }),
      );

      this.logger.log(`Fichier copié vers trash: ${key}`);

      await this.deleteFromProduction(key);

      this.logger.log(`Fichier supprimé du bucket de production: ${key}`);
    }

    async moveTrashToProduction(key: string): Promise<void> {
      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.productionBucket,
          CopySource: `${this.trashBucket}/${this.encodeS3Key(key)}`,
          Key: key,
        }),
      );

      this.logger.log(`Fichier copié vers production: ${key}`);

      await this.deleteFromTrash(key);

      this.logger.log(`Fichier supprimé du bucket trash: ${key}`);
    }

    private encodeS3Key(key: string): string {
      return encodeURIComponent(key).replace(/%2F/g, '/');
    }

    private async toBuffer(body: any): Promise<Buffer> {
      if (Buffer.isBuffer(body)) return body;
      if (body instanceof Uint8Array) return Buffer.from(body);

      if (body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }

      if (typeof body.arrayBuffer === 'function') {
        const ab = await body.arrayBuffer();
        return Buffer.from(ab);
      }

      if (body && typeof body[Symbol.asyncIterator] === 'function') {
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }

      throw new Error('Format de stream RustFS non supporté');
    }
  }
  