import { AuditEntity } from "./audit.entity";

export class UserEntity extends AuditEntity {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    is_active: boolean;
}