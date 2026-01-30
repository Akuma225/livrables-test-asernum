import { SharingAccess, SharingMode, SharingStatus } from "../../../../generated/prisma/enums";
import { BaseVm } from "@akuma225/viewmodel";
import { UserVm } from "./user.vm";
import { ApiResponseProperty } from "@nestjs/swagger";
import { SharingLinkEntity } from "src/resources/sharing-link/entities/sharing-link.entity";
import { SharingLinkHistoryVm } from "./sharing-link-history.vm";
import { SharingLinkItemVm } from "./sharing-link-item.vm";

export class SharingLinkVm extends BaseVm {
    @ApiResponseProperty()
    id: string;

    @ApiResponseProperty()
    token: string;

    @ApiResponseProperty()
    owner?: UserVm;

    @ApiResponseProperty()
    recipient?: UserVm;

    @ApiResponseProperty()
    expires_at?: Date;

    @ApiResponseProperty()
    mode: SharingMode;

    @ApiResponseProperty()
    access: SharingAccess;

    @ApiResponseProperty()
    status: SharingStatus;

    @ApiResponseProperty()
    status_reason?: string;

    @ApiResponseProperty()
    status_last_changed_at?: Date;

    @ApiResponseProperty()
    sharing_link_histories?: SharingLinkHistoryVm[];

    @ApiResponseProperty()
    sharing_items?: SharingLinkItemVm[];

    constructor(data: SharingLinkEntity) {
        super(data);
        this.id = data.id;
        this.token = data.token;
        this.owner = data.owner ? new UserVm(data.owner) : undefined;
        this.recipient = data.recipient ? new UserVm(data.recipient) : undefined;
        this.expires_at = data.expires_at;
        this.mode = data.mode;
        this.access = data.access;
        this.status = data.status;
        this.status_reason = data.status_reason;
        this.status_last_changed_at = data.status_last_changed_at;
        this.sharing_link_histories = data.sharing_link_histories ? data.sharing_link_histories.map(history => new SharingLinkHistoryVm(history)) : undefined;
        this.sharing_items = data.sharing_items ? data.sharing_items.map(item => new SharingLinkItemVm(item)) : undefined;
    }
}