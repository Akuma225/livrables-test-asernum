import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RustFSService } from 'src/commons/services/rustfs.service';
import { AntivirusService, ScanResult } from 'src/commons/services/antivirus.service';
import { DocumentMetadataService } from 'src/commons/services/document-metadata.service';
import { ImageProcessingService } from 'src/commons/services/image-processing.service';
import { VideoProcessingService } from 'src/commons/services/video-processing.service';
import { AudioProcessingService } from 'src/commons/services/audio-processing.service';
import { ProcessDocumentDto } from './dto/process-document.dto';
import { UploadStatus } from '../../../generated/prisma/client';
import { DocumentEntity } from './entities/document.entity';
import * as path from 'node:path';
import { DOCUMENTS_REPOSITORY } from './ports/documents-repository.port';
import type { DocumentsRepository } from './ports/documents-repository.port';

export interface ProcessingResult {
    document: any;
    signedUrl: string;
    scanResult: ScanResult;
    isQuarantined: boolean;
}

@Injectable()
export class DocumentProcessingService {
    private readonly logger = new Logger(DocumentProcessingService.name);

    constructor(
        @Inject(DOCUMENTS_REPOSITORY) private readonly documentsRepository: DocumentsRepository,
        private readonly rustFSService: RustFSService,
        private readonly antivirusService: AntivirusService,
        private readonly documentMetadataService: DocumentMetadataService,
        private readonly imageProcessingService: ImageProcessingService,
        private readonly videoProcessingService: VideoProcessingService,
        private readonly audioProcessingService: AudioProcessingService,
    ) {}

    async getDocumentSignedUrl(documentPath: string) {
        return this.rustFSService.getSignedUrl(documentPath);
    }

    async getDocumentSignedUrlFromProduction(documentPath: string) {
        return this.rustFSService.getSignedUrlFromProduction(documentPath);
    }

    async findDocumentInfo(documentId: string) {
        return this.documentsRepository.findById(documentId);
    }

    async canDocumentBeProcessed(document: DocumentEntity): Promise<boolean> {
        // Important pour BullMQ: un retry relance le même job.
        // Le doc peut déjà être en PROCESSING (attempt précédent), mais on doit permettre la reprise.
        return document.upload_status === UploadStatus.STAGING || document.upload_status === UploadStatus.PROCESSING;
    }

    async markDocumentFailed(documentId: string, error: unknown): Promise<void> {
        const doc = await this.findDocumentInfo(documentId);
        if (!doc) return;

        // Ne pas écraser un statut terminal
        if (doc.upload_status !== UploadStatus.PROCESSING) return;

        const err: any = error as any;
        const message = err?.message ?? String(error);
        const stack = err?.stack;

        const metadata: any = (doc.metadata as any) ?? {};
        const processing: any = (metadata.processing as any) ?? {};
        const failure = {
            at: new Date().toISOString(),
            message,
            ...(stack ? { stack } : {}),
        };

        // Déplacer le fichier du staging vers le bucket failed (si possible),
        // pour éviter de laisser un artefact "bloqué" en staging.
        try {
            const failedKey = await this.rustFSService.moveToFailed(doc.path);
            (failure as any).failed_storage = { bucket: 'RUSTFS_FAILED_BUCKET', key: failedKey };
        } catch (moveErr) {
            const moveMsg = (moveErr as any)?.message ?? String(moveErr);
            (failure as any).failed_storage = { skipped: true, error: moveMsg };
            this.logger.warn(`Impossible de déplacer vers failed (document_id=${documentId} path=${doc.path}): ${moveMsg}`);
        }

        await this.documentsRepository.updateById(documentId, {
            upload_status: UploadStatus.FAILED,
            metadata: { ...metadata, processing: { ...processing, failure } },
        });
    }

    /**
     * Télécharge le buffer d'un fichier à partir de sa clé dans le bucket
     */
    async downloadDocumentBuffer(documentPath: string): Promise<Buffer> {
        return this.rustFSService.downloadBuffer(documentPath);
    }

    /**
     * Télécharge le buffer d'un fichier à partir de son URL signée
     */
    async downloadDocumentBufferFromUrl(url: string): Promise<Buffer> {
        return this.rustFSService.downloadBufferFromUrl(url);
    }

    /**
     * Scanne un document pour détecter les virus
     */
    async scanDocument(buffer: Buffer, filename?: string): Promise<ScanResult> {
        return this.antivirusService.scanBuffer(buffer, filename);
    }

    /**
     * Met un document en quarantaine
     */
    async quarantineDocument(documentId: string, documentPath: string): Promise<void> {
        // Déplacer le fichier vers le bucket de quarantaine
        await this.rustFSService.moveToQuarantine(documentPath);

        // Mettre à jour le statut du document en base de données
        await this.documentsRepository.updateById(documentId, {
            upload_status: UploadStatus.IN_QUARANTINE,
        });

        this.logger.warn(`Document mis en quarantaine: ${documentId}`);
    }

    /**
     * Traite un document avec scan antivirus
     * Si le fichier est infecté, il est déplacé vers le bucket de quarantaine
     */
    async processDocument(data: ProcessDocumentDto): Promise<ProcessingResult> {
        const document = await this.findDocumentInfo(data.document_id);
        if (!document) {
            throw new NotFoundException('Le document n\'existe pas dans le stockage');
        }

        if (!await this.canDocumentBeProcessed(document as DocumentEntity)) {
            throw new BadRequestException('Le document ne peut pas être traité car il n\'est pas en attente de traitement');
        }

        // Mettre à jour le statut en PROCESSING uniquement si on démarre depuis STAGING.
        // (En retry BullMQ, il est souvent déjà en PROCESSING.)
        if (document.upload_status === UploadStatus.STAGING) {
            await this.documentsRepository.updateById(document.id, {
                upload_status: UploadStatus.PROCESSING,
            });
        }

        // Télécharger le buffer du document
        const buffer = await this.downloadDocumentBuffer(document.path);
        
        // Scanner le document pour les virus
        const scanResult = await this.scanDocument(buffer, document.original_name);

        let isQuarantined = false;

        if (scanResult.isInfected) {
            // Fichier infecté : mettre en quarantaine
            this.logger.warn(
                `Virus détecté dans le document ${document.id}: ${scanResult.viruses.join(', ')}`
            );
            
            await this.quarantineDocument(document.id, document.path);
            isQuarantined = true;

            return {
                document: await this.findDocumentInfo(document.id),
                signedUrl: '',
                scanResult,
                isQuarantined,
            };
        }

        // Fichier sain : appliquer éventuellement un traitement (ex: compression)
        const mime = (document.mime_type ?? '').toLowerCase();
        const ext = path.extname(document.original_name ?? '').toLowerCase();

        let processedBuffer = buffer;
        let processing: Record<string, any> | null = null;

        if (mime.startsWith('image/') && data.image_processing_opts?.compression) {
            const out = await this.imageProcessingService.compress({
                buffer,
                mimeType: mime,
                level: data.image_processing_opts.compression.level,
            });
            processedBuffer = out.buffer;
            processing = { image: out.processing };
        } else if (mime.startsWith('video/') && data.video_processing_opts?.compression) {
            const out = await this.videoProcessingService.compress({
                buffer,
                ext,
                level: data.video_processing_opts.compression.level,
            });
            processedBuffer = out.buffer;
            processing = { video: out.processing };
        } else if (mime.startsWith('audio/') && data.audio_processing_opts?.compression) {
            const out = await this.audioProcessingService.compress({
                buffer,
                ext,
                level: data.audio_processing_opts.compression.level,
            });
            processedBuffer = out.buffer;
            processing = { audio: out.processing };
        }

        // Extraire les metadata sur le fichier final (post-processing)
        const metadataBase = await this.documentMetadataService.extract(
            { ...(document as DocumentEntity), size: processedBuffer.length },
            processedBuffer
        );
        const metadata = processing ? { ...metadataBase, processing } : metadataBase;

        // Publier en production :
        // - si on a modifié le buffer => upload prod + suppression staging
        // - sinon => copy server-side (moveToProduction)
        if (processedBuffer !== buffer) {
            await this.rustFSService.uploadToProduction(document.path, processedBuffer, document.mime_type);
            await this.rustFSService.delete(document.path);
        } else {
            await this.rustFSService.moveToProduction(document.path);
        }

        // Mettre à jour le statut et retourner l'URL signée (production)
        await this.documentsRepository.updateById(document.id, {
            upload_status: UploadStatus.UPLOADED,
            metadata,
            size: processedBuffer.length,
        });

        const signedUrl = await this.getDocumentSignedUrlFromProduction(document.path);
        
        return {
            document: await this.findDocumentInfo(document.id),
            signedUrl,
            scanResult,
            isQuarantined,
        };
    }

    /**
     * Scanne un document sans le traiter (pour vérification uniquement)
     */
    async scanDocumentOnly(documentId: string): Promise<ScanResult> {
        const document = await this.findDocumentInfo(documentId);
        if (!document) {
            throw new NotFoundException('Le document n\'existe pas dans le stockage');
        }

        const buffer = await this.downloadDocumentBuffer(document.path);
        return this.scanDocument(buffer, document.original_name);
    }
}
