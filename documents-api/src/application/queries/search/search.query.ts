import { QueryBase } from "src/common/cqrs/query-base";

export interface SearchParams {
    q: string;
    type?: 'all' | 'folders' | 'documents';
}

export class SearchQuery extends QueryBase<SearchParams> {
    readonly user_id: string;

    constructor(user_id: string, params: SearchParams) {
        super({ params });
        this.user_id = user_id;
    }
}

