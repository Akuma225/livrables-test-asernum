import { Controller, Get, Query, Req, Version } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { QueryBus } from "@nestjs/cqrs";
import { IsUserAuthenticated } from "src/common/decorators/is-user-authenticated.decorator";
import { CustomRequest } from "src/common/interfaces/custom-request";
import { SearchDto } from "../dto/search/search.dto";
import { SearchQuery } from "../queries/search/search.query";

@ApiTags('Search')
@Controller('search')
export class SearchController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get()
    @ApiOperation({ summary: 'Rechercher des dossiers et/ou des documents' })
    @Version('1')
    @IsUserAuthenticated()
    async search(@Req() req: CustomRequest, @Query() query: SearchDto) {
        return this.queryBus.execute(
            new SearchQuery(req.user?.sub as string, {
                q: query.q,
                type: query.type ?? 'all',
            })
        );
    }
}

