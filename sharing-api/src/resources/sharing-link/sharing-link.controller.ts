import { Body, Controller, Get, Param, Patch, Post, Query, Req, Version } from '@nestjs/common';
import { SharingLinkService } from './sharing-link.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsUserAuthenticated } from 'src/commons/decorators/is-user-authenticated.decorator';
import type { CustomRequest } from 'src/commons/interfaces/custom-request';
import { FilterSharingLinkListDto } from './dto/filter-sharing-link-list.dto';
import type { IPaginationParams } from '@akuma225/pagination';
import { PaginationParams } from '@akuma225/pagination';
import { SharingLinkVm } from 'src/commons/shared/viewmodels/sharing-link.vm';
import { CreateSharingLinkDto } from './dto/create-sharing-link.dto';
import { UpdateSharingLinkDto } from './dto/update-sharing-link.dto';
import { TreatPendingSharingLinkDto } from './dto/treat-pending-sharing-link.dto';

@ApiTags('Sharing Links')
@Controller('sharing-links')
export class SharingLinkController {
  constructor(private readonly sharingLinkService: SharingLinkService) {}

  @Get('emitted')
  @Version('1')
  @ApiOperation({ summary: 'Get all emitted sharing links' })
  @IsUserAuthenticated()
  async getEmittedSharingLinks(
    @Req() req: CustomRequest,
    @Query() query: FilterSharingLinkListDto,
    @PaginationParams() params: IPaginationParams,
  ) {
    return SharingLinkVm.createPaginated(
      await this.sharingLinkService.findAllEmittedForConnectedUser(req.user!, query, params)
    )
  }

  @Get('received')
  @Version('1')
  @ApiOperation({ summary: 'Get all received sharing links' })
  @IsUserAuthenticated()
  async getReceivedSharingLinks(
    @Req() req: CustomRequest,
    @Query() query: FilterSharingLinkListDto,
    @PaginationParams() params: IPaginationParams,
  ) {
    return SharingLinkVm.createPaginated(
      await this.sharingLinkService.findAllReceivedForConnectedUser(req.user!, query, params)
    )
  }

  @Get('by-id/:id')
  @Version('1')
  @ApiOperation({ summary: 'Get a sharing link by id' })
  @IsUserAuthenticated()
  async getSharingLinkById(
    @Param('id') id: string,
  ) {
    return SharingLinkVm.create(await this.sharingLinkService.findById(id))
  }

  @Get('by-token/:token')
  @Version('1')
  @ApiOperation({ summary: 'Get a sharing link by token' })
  async getSharingLinkByToken(
    @Param('token') token: string,
  ) {
    return SharingLinkVm.create(await this.sharingLinkService.findByToken(token))
  }

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create a sharing link' })
  @IsUserAuthenticated()
  async createSharingLink(
    @Req() req: CustomRequest,
    @Body() body: CreateSharingLinkDto,
  ) {
    return SharingLinkVm.create(await this.sharingLinkService.create(body, req.user!))
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update a sharing link' })
  @IsUserAuthenticated()
  async updateSharingLink(
    @Param('id') id: string,
    @Body() body: UpdateSharingLinkDto,
    @Req() req: CustomRequest,
  ) {
    return SharingLinkVm.create(await this.sharingLinkService.update(id, body, req.user!))
  }

  @Patch(':id/treat-pending')
  @Version('1')
  @ApiOperation({ summary: 'Treat a pending sharing link' })
  @IsUserAuthenticated()
  async treatPendingSharingLink(
    @Param('id') id: string,
    @Body() body: TreatPendingSharingLinkDto,
    @Req() req: CustomRequest,
  ) {
    return SharingLinkVm.create(await this.sharingLinkService.treatPendingSharingLink(id, body, req.user!))
  }

  @Patch(':id/revoke')
  @Version('1')
  @ApiOperation({ summary: 'Revoke a sharing link' })
  @IsUserAuthenticated()
  async revokeSharingLink(
    @Param('id') id: string,
    @Req() req: CustomRequest,
  ) {
    return SharingLinkVm.create(await this.sharingLinkService.revoke(id, req.user!))
  }
}
