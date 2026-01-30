import { AuditEntity } from "./audit.entity";
import { UserEntity } from "./user.entity";

export class UserSessionEntity extends AuditEntity {
    id?: string | undefined;
    user_id: string;
    user?: UserEntity | undefined;
    refresh_token: string;
    metadata?: any;
    is_active?: boolean | undefined;
}