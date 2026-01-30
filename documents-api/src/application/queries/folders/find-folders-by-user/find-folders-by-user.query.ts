import { QueryBase } from "src/common/cqrs/query-base";

export interface FindFoldersByUserParams {
    includeParent?: boolean;
    includeSubFolders?: boolean;
    includeTotalSize?: boolean;
    includeDocuments?: boolean;
    treeView?: boolean; // Si true, retourne uniquement les dossiers racine avec leurs sous-dossiers
}

export class FindFoldersByUserQuery extends QueryBase<FindFoldersByUserParams> {
    readonly user_id: string;

    constructor(user_id: string, params: FindFoldersByUserParams = {}) {
        super({ params });
        this.user_id = user_id;
    }
}
