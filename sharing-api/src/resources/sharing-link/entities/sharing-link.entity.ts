import { SharingAccess, SharingMode, SharingStatus } from "../../../../generated/prisma/client";
import { AuditEntity } from "src/commons/shared/entities/audit.entity";
import { UserEntity } from "src/commons/shared/entities/user.entity";
import { SharingItemEntity } from "./sharing-item.entity";
import { SharingLinkHistoryEntity } from "./sharing-link-history.entity";

export class SharingLinkEntity extends AuditEntity {
    id: string;
    token: string;
    owner_id: string;
    owner?: UserEntity;
    recipient_id?: string;
    recipient?: UserEntity;
    expires_at?: Date;
    mode: SharingMode;
    access: SharingAccess;
    status: SharingStatus;
    status_reason?: string;
    status_last_changed_at?: Date;
    sharing_link_histories?: SharingLinkHistoryEntity[];
    sharing_items?: SharingItemEntity[];
}