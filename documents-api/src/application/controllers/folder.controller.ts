import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Version } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { IsUserAuthenticated } from "src/common/decorators/is-user-authenticated.decorator";
import { Authorize } from "src/common/decorators/authorize.decorator";
import { CustomRequest } from "src/common/interfaces/custom-request";
import { RightAction, RightResource } from "src/common/authorization/rights.types";
import { CreateFolderDto } from "../dto/folders/create-folder.dto";
import { UpdateFolderDto } from "../dto/folders/update-folder.dto";
import { ListFoldersFilterDto } from "../dto/folders/list-folders-filter.dto";
import { GetFolderFilterDto } from "../dto/folders/get-folder-filter.dto";
import { MoveFolderDto } from "../dto/folders/move-folder.dto";
import { CreateFolderCommand } from "../commands/folders/create-folder/create-folder.command";
import { UpdateFolderCommand } from "../commands/folders/update-folder/update-folder.command";
import { DeleteFolderCommand } from "../commands/folders/delete-folder/delete-folder.command";
import { FindFolderByIdQuery } from "../queries/folders/find-folder-by-id/find-folder-by-id.query";
import { FindFoldersByUserQuery } from "../queries/folders/find-folders-by-user/find-folders-by-user.query";

@ApiTags('Folders')
@Controller('folders')
export class FolderController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus
    ) {}

    @Post()
    @ApiOperation({ summary: 'Créer un nouveau dossier' })
    @Version('1')
    @IsUserAuthenticated()
    async create(
        @Body() createFolderDto: CreateFolderDto,
        @Req() req: CustomRequest
    ) {
        return this.commandBus.execute(
            new CreateFolderCommand({
                ...createFolderDto,
                user_id: req.user?.sub as string,
            })
        );
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Modifier un dossier' })
    @Version('1')
    @Authorize([{ action: RightAction.UPDATE, resource: RightResource.FOLDER }])
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateFolderDto: UpdateFolderDto,
        @Req() req: CustomRequest
    ) {
        return this.commandBus.execute(
            new UpdateFolderCommand({
                id,
                ...updateFolderDto,
                user_id: req.user?.sub as string,
            })
        );
    }

    @Patch(':id/move')
    @ApiOperation({ summary: 'Déplacer un dossier dans un autre dossier' })
    @Version('1')
    @Authorize([
        { action: RightAction.MOVE, resource: RightResource.FOLDER },
        { action: RightAction.MOVE, resource: RightResource.FOLDER, idSource: 'body', idParam: 'parent_id', optional: true },
    ])
    async moveIntoFolder(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: MoveFolderDto,
        @Req() req: CustomRequest
    ) {
        return this.commandBus.execute(
            new UpdateFolderCommand({
                id,
                parent_id: body.parent_id,
                user_id: req.user?.sub as string,
            })
        );
    }

    @Patch(':id/move-to-root')
    @ApiOperation({ summary: 'Déplacer un dossier à la racine (sans parent)' })
    @Version('1')
    @Authorize([{ action: RightAction.MOVE, resource: RightResource.FOLDER }])
    async moveToRoot(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest
    ) {
        return this.commandBus.execute(
            new UpdateFolderCommand({
                id,
                parent_id: null,
                user_id: req.user?.sub as string,
            })
        );
    }

    @Get()
    @ApiOperation({ summary: 'Lister les dossiers de l\'utilisateur connecté' })
    @Version('1')
    @IsUserAuthenticated()
    async findAll(
        @Req() req: CustomRequest,
        @Query() filters: ListFoldersFilterDto
    ) {
        return this.queryBus.execute(
            new FindFoldersByUserQuery(req.user?.sub as string, {
                treeView: filters.tree ?? false,
                includeParent: filters.includeParent ?? false,
                includeSubFolders: filters.includeSubFolders ?? false,
                includeTotalSize: filters.includeTotalSize ?? false,
                includeDocuments: filters.includeDocuments ?? false,
            })
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer un dossier par son ID' })
    @Version('1')
    @Authorize([{ action: RightAction.READ, resource: RightResource.FOLDER }])
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest,
        @Query() filters: GetFolderFilterDto
    ) {
        return this.queryBus.execute(
            new FindFolderByIdQuery(
                id, 
                req.user?.sub as string,
                {
                    includeParent: filters.includeParent ?? false,
                    includeSubFolders: filters.includeSubFolders ?? false,
                    includeTotalSize: filters.includeTotalSize ?? false,
                    includeDocuments: filters.includeDocuments ?? false,
                }
            )
        );
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Supprimer un dossier (suppression définitive, récursive)' })
    @Version('1')
    @Authorize([{ action: RightAction.DELETE, resource: RightResource.FOLDER, includeDeleted: true }])
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: CustomRequest
    ) {
        return this.commandBus.execute(
            new DeleteFolderCommand({
                id,
                user_id: req.user?.sub as string,
            })
        );
    }
}
