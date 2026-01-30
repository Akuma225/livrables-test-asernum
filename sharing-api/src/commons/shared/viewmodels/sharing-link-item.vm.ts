import { BaseVm } from "@akuma225/viewmodel";
import { ApiResponseProperty } from "@nestjs/swagger";
import { SharingItemEntity } from "src/resources/sharing-link/entities/sharing-item.entity";

export class SharingLinkItemVm extends BaseVm {
    @ApiResponseProperty()
    id: string;

    @ApiResponseProperty()
    sharing_link_id?: string;

    @ApiResponseProperty()
    document_id?: string;

    @ApiResponseProperty()
    folder_id?: string;

    constructor(data: SharingItemEntity) {
        super(data);
        this.id = data.id;
        this.sharing_link_id = data.sharing_link_id;
        this.document_id = data.document_id;
        this.folder_id = data.folder_id;
    }
}