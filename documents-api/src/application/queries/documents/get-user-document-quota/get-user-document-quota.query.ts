import { QueryBase } from "src/common/cqrs/query-base";

export class GetUserDocumentQuotaQuery extends QueryBase {
    readonly user_id: string;

    constructor(user_id: string) {
        super({});
        this.user_id = user_id;
    }
}

