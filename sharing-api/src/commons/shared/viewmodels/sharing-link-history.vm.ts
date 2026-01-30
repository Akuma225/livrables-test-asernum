import { BaseVm } from "@akuma225/viewmodel";
import { ApiResponseProperty } from "@nestjs/swagger";
import { SharingStatus } from "../../../../generated/prisma/enums";
import { SharingLinkHistoryEntity } from "src/resources/sharing-link/entities/sharing-link-history.entity";

export class SharingLinkHistoryVm extends BaseVm {
    @ApiResponseProperty()
    id: string;

    @ApiResponseProperty()
    sharing_link_id?: string;

    @ApiResponseProperty()
    previous_status?: SharingStatus;

    @ApiResponseProperty()
    new_status?: SharingStatus;

    @ApiResponseProperty()
    reason?: string;

    constructor(data: SharingLinkHistoryEntity) {
        super(data);
        this.id = data.id;
        this.sharing_link_id = data.sharing_link_id;
        this.previous_status = data.previous_status;
        this.new_status = data.new_status;
        this.reason = data.reason;
    }
}