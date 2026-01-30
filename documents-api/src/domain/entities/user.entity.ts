import { AuditEntity } from "./audit.entity";

export class UserEntity extends AuditEntity {
    id?: string | undefined;
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    is_active?: boolean | undefined;
}