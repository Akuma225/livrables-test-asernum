import { AuditEntity } from "./audit.entity";
import type { DocumentEntity } from "./document.entity";

export class FolderEntity extends AuditEntity {
    id?: string | undefined;
    parent_id?: string | null | undefined;
    user_id: string;
    name: string;
    parent?: FolderEntity | null | undefined;
    sub_folders?: FolderEntity[] | undefined;
    total_size?: number | undefined; // Taille totale des documents en octets
    documents?: DocumentEntity[] | undefined;
}
