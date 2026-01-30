import { QueryBase } from "src/common/cqrs/query-base";

export interface FindFolderByIdParams {
    includeParent?: boolean;
    includeSubFolders?: boolean;
    includeTotalSize?: boolean;
    includeDocuments?: boolean;
}

export class FindFolderByIdQuery extends QueryBase<FindFolderByIdParams> {
    readonly user_id: string;

    constructor(id: string, user_id: string, params: FindFolderByIdParams = {}) {
        super({ id, params });
        this.user_id = user_id;
    }
}
