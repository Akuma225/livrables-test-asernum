import { AuditEntity } from "src/commons/shared/entities/audit.entity";
import { SharingLinkEntity } from "./sharing-link.entity";
import { SharingStatus } from "../../../../generated/prisma/enums";

export class SharingLinkHistoryEntity extends AuditEntity {
    id: string;
    sharing_link_id?: string;
    sharing_link?: SharingLinkEntity;
    previous_status?: SharingStatus;
    new_status?: SharingStatus;
    reason?: string;
}