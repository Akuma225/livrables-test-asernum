import { QueryBase } from "src/common/cqrs/query-base";

export class FindUserByIdQuery extends QueryBase {
    constructor(id: string) {
        super({ id: id });
    }
}