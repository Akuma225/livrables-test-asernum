import { AuditEntity } from "src/commons/shared/entities/audit.entity";
import { SharingLinkEntity } from "./sharing-link.entity";

export class SharingItemEntity extends AuditEntity {
    id: string;
    sharing_link_id?: string;
    sharing_link?: SharingLinkEntity;
    document_id?: string;
    document?: any;
    folder_id?: string;
    folder?: any;
}