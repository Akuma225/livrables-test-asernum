import { Controller, Get, Logger, Param, Req, Version } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { QueryBus } from '@nestjs/cqrs';
import { FindUserByIdQuery } from "../queries/users/find-user-by-id/find-user-by-id.query";
import { IsUserAuthenticated } from "src/common/decorators/is-user-authenticated.decorator";
import { CustomRequest } from "src/common/interfaces/custom-request";

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(
        private readonly queryBus: QueryBus
    ) {}

    @Get('me')
    @ApiOperation({ summary: 'Get connected user information' })
    @Version('1')
    @IsUserAuthenticated()
    async getCurrentUser(
        @Req() req: CustomRequest
    ){
        return this.queryBus.execute(new FindUserByIdQuery(req.user?.sub as string));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by id' })
    @Version('1')
    async findById(
        @Param('id') id: string
    ){
        return this.queryBus.execute(new FindUserByIdQuery(id));
    }
}