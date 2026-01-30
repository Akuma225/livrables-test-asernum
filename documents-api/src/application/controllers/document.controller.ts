import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, Res, Version } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { FastifyReply, FastifyRequest } from "fastify";
import { MultipartFile, MultipartValue } from "@fastify/multipart";
import { IsUserAuthenticated } from "src/common/decorators/is-user-authenticated.decorator";
import { Authorize } from "src/common/decorators/authorize.decorator";
import { CustomRequest } from "src/common/interfaces/custom-request";
import { UploadDocumentCommand } from "../commands/documents/upload-document/upload-document.command";
import { FindDocumentByIdQuery } from "../queries/documents/find-document-by-id/find-document-by-id.query";
import { DownloadDocumentQuery } from "../queries/documents/download-document/download-document.query";
import { DeleteDocumentCommand } from "../commands/documents/delete-document/delete-document.command";
import { RestoreDocumentCommand } from "../commands/documents/restore-document/restore-document.command";
import { GetUserDocumentQuotaQuery } from "../queries/documents/get-user-document-quota/get-user-document-quota.query";
import { MoveDocumentDto } from "../dto/documents/move-document.dto";
import { MoveDocumentCommand } from "../commands/documents/move-document/move-document.command";
import { RightAction, RightResource } from "src/common/authorization/rights.types";
import {
    AudioProcessingOptionsDto,
    DocProcessingOptionsDto,
    ImageProcessingOptionsDto,
    VideoProcessingOptionsDto,
} from "src/domain/interfaces/process-document-dto";

// Extension du type FastifyRequest pour inclure les méthodes de @fastify/multipart
interface FastifyMultipartRequest extends FastifyRequest {
    isMultipart: () => boolean;
    parts: () => AsyncIterableIterator<MultipartFile | MultipartValue>;
}

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Get('quota')
    @ApiOperation({ summary: 'Récupérer le quota d’upload et l’espace consommé' })
    @Version('1')
    @IsUserAuthenticated()
    async getQuota(@Req() req: CustomRequest) {
        return this.queryBus.execute(new GetUserDocumentQuotaQuery(req.user?.sub as string));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer un document par son ID' })
    @Version('1')
    @Authorize([{ action: RightAction.READ, resource: RightResource.DOCUMENT }])
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest,
    ) {
        return this.queryBus.execute(
            new FindDocumentByIdQuery(id, req.user?.sub as string)
        );
    }

    @Patch(':id/move')
    @ApiOperation({ summary: 'Déplacer un document dans un dossier' })
    @Version('1')
    @Authorize([
        { action: RightAction.MOVE, resource: RightResource.DOCUMENT },
        { action: RightAction.MOVE, resource: RightResource.FOLDER, idSource: 'body', idParam: 'folder_id' },
    ])
    async move(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest,
        @Body() body: MoveDocumentDto,
    ) {
        return this.commandBus.execute(
            new MoveDocumentCommand({
                id,
                folder_id: body.folder_id,
                user_id: req.user?.sub as string,
            })
        );
    }

    @Get(':id/download')
    @ApiOperation({ summary: 'Télécharger un document' })
    @Version('1')
    @Authorize([{ action: RightAction.DOWNLOAD, resource: RightResource.DOCUMENT }])
    async download(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest,
        @Res({ passthrough: true }) res: FastifyReply,
    ) {
        const { buffer, contentType, filename } = await this.queryBus.execute(
            new DownloadDocumentQuery(id, req.user?.sub as string),
        );

        res.header('Content-Type', contentType);
        res.header('Content-Disposition', `attachment; filename="${filename}"`);

        return buffer;
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Supprimer un document (corbeille ou suppression définitive)' })
    @Version('1')
    @Authorize([{ action: RightAction.DELETE, resource: RightResource.DOCUMENT, includeDeleted: true }])
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest,
    ) {
        return this.commandBus.execute(
            new DeleteDocumentCommand({ id, user_id: req.user?.sub as string })
        );
    }

    @Post(':id/restore')
    @ApiOperation({ summary: 'Restaurer un document depuis la corbeille' })
    @Version('1')
    @Authorize([{ action: RightAction.RESTORE, resource: RightResource.DOCUMENT, includeDeleted: true }])
    async restore(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest,
    ) {
        return this.commandBus.execute(
            new RestoreDocumentCommand({ id, user_id: req.user?.sub as string })
        );
    }

    @Post('upload')
    @ApiOperation({ summary: 'Uploader un document dans un dossier' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'folder_id'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Le fichier à uploader',
                },
                folder_id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'ID du dossier dans lequel uploader le document',
                },
                image_processing_opts: {
                    type: 'string',
                    description: 'JSON (optionnel) des options image_processing_opts',
                    example: '{"compression":{"level":6}}',
                },
                video_processing_opts: {
                    type: 'string',
                    description: 'JSON (optionnel) des options video_processing_opts',
                    example: '{"compression":{"level":6}}',
                },
                audio_processing_opts: {
                    type: 'string',
                    description: 'JSON (optionnel) des options audio_processing_opts',
                    example: '{"compression":{"level":6}}',
                },
                doc_processing_opts: {
                    type: 'string',
                    description: 'JSON (optionnel) des options doc_processing_opts',
                    example: '{"opts":{"foo":"bar"}}',
                },
            },
        },
    })
    @Version('1')
    @IsUserAuthenticated()
    async upload(@Req() req: CustomRequest & FastifyMultipartRequest) {
        // Vérifier que la requête est multipart
        if (!req.isMultipart()) {
            throw new BadRequestException('La requête doit être de type multipart/form-data');
        }

        // Récupérer les données du formulaire
        const parts = req.parts();
        
        let file: {
            filename: string;
            mimetype: string;
            buffer: Buffer;
        } | null = null;
        let folderId: string | null = null;
        let image_processing_opts: ImageProcessingOptionsDto | undefined;
        let video_processing_opts: VideoProcessingOptionsDto | undefined;
        let audio_processing_opts: AudioProcessingOptionsDto | undefined;
        let doc_processing_opts: DocProcessingOptionsDto | undefined;

        for await (const part of parts) {
            if (part.type === 'file') {
                // C'est un fichier
                if (part.fieldname === 'file') {
                    const chunks: Buffer[] = [];
                    for await (const chunk of part.file) {
                        chunks.push(chunk);
                    }
                    file = {
                        filename: part.filename,
                        mimetype: part.mimetype,
                        buffer: Buffer.concat(chunks),
                    };
                }
            } else {
                // C'est un champ texte
                if (part.fieldname === 'folder_id') {
                    folderId = part.value as string;
                }
                if (part.fieldname === 'image_processing_opts') {
                    image_processing_opts = this.parseOpts<ImageProcessingOptionsDto>('image_processing_opts', part.value as string);
                    this.validateCompressionLevel(image_processing_opts?.compression?.level, 'image_processing_opts.compression.level');
                }
                if (part.fieldname === 'video_processing_opts') {
                    video_processing_opts = this.parseOpts<VideoProcessingOptionsDto>('video_processing_opts', part.value as string);
                    this.validateCompressionLevel(video_processing_opts?.compression?.level, 'video_processing_opts.compression.level');
                }
                if (part.fieldname === 'audio_processing_opts') {
                    audio_processing_opts = this.parseOpts<AudioProcessingOptionsDto>('audio_processing_opts', part.value as string);
                    this.validateCompressionLevel(audio_processing_opts?.compression?.level, 'audio_processing_opts.compression.level');
                }
                if (part.fieldname === 'doc_processing_opts') {
                    doc_processing_opts = this.parseOpts<DocProcessingOptionsDto>('doc_processing_opts', part.value as string);
                }
            }
        }

        // Validations
        if (!file) {
            throw new BadRequestException('Le fichier est requis');
        }

        if (!folderId) {
            throw new BadRequestException('L\'ID du dossier (folder_id) est requis');
        }

        // Exécuter la commande d'upload
        return this.commandBus.execute(
            new UploadDocumentCommand({
                folder_id: folderId,
                user_id: req.user?.sub as string,
                original_name: file.filename,
                mime_type: file.mimetype,
                size: file.buffer.length,
                buffer: file.buffer,
                image_processing_opts,
                video_processing_opts,
                audio_processing_opts,
                doc_processing_opts,
            })
        );
    }

    private parseOpts<T>(field: string, value: string): T {
        if (!value || value.trim().length === 0) {
            throw new BadRequestException(`Le champ ${field} est vide`);
        }
        try {
            return JSON.parse(value) as T;
        } catch {
            throw new BadRequestException(`Le champ ${field} doit être un JSON valide`);
        }
    }

    private validateCompressionLevel(level: number | undefined, field: string) {
        if (level === undefined || level === null) return;
        if (!Number.isInteger(level) || level < 1 || level > 99) {
            throw new BadRequestException(`Le champ ${field} doit être un entier entre 1 et 99`);
        }
    }
}
