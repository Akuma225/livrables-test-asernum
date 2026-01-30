import { QueryBase } from "src/common/cqrs/query-base";

export class DownloadDocumentQuery extends QueryBase {
    readonly user_id: string;

    constructor(id: string, user_id: string) {
        super({ id });
        this.user_id = user_id;
    }
}

