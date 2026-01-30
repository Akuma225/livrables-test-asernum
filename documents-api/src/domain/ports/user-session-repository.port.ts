import { UserSessionEntity } from "../entities/user-session.entity";
import { IUserSessionRepository } from "../repositories/user-session.repository";

export abstract class UserSessionRepositoryPort implements IUserSessionRepository {
    abstract create(userSession: UserSessionEntity): Promise<UserSessionEntity>;
    abstract findByRefreshToken(refreshToken: string): Promise<UserSessionEntity | null>;
    abstract findByUserId(userId: string): Promise<UserSessionEntity | null>;
    abstract update(userSession: UserSessionEntity): Promise<UserSessionEntity>;
    abstract delete(id: string): Promise<void>;
}
