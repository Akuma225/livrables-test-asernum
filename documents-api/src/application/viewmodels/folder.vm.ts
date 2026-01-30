import { ApiResponseProperty } from "@nestjs/swagger";
import { FolderEntity } from "src/domain/entities/folder.entity";
import { DocumentVm } from "./document.vm";

export class FolderVm {
    @ApiResponseProperty()
    id: string;

    @ApiResponseProperty()
    name: string;

    @ApiResponseProperty()
    parent_id?: string | null;

    @ApiResponseProperty()
    user_id: string;

    @ApiResponseProperty()
    created_at?: Date;

    @ApiResponseProperty()
    updated_at?: Date;

    @ApiResponseProperty({ type: [DocumentVm] })
    documents?: DocumentVm[];

    constructor(data: FolderEntity) {
        this.id = data.id!;
        this.name = data.name;
        this.parent_id = data.parent_id;
        this.user_id = data.user_id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.documents = data.documents ? data.documents.map(d => new DocumentVm(d)) : undefined;
    }
}
