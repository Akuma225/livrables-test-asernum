import { UserSessionEntity } from "../entities/user-session.entity";

export interface IUserSessionRepository {
    create(userSession: UserSessionEntity): Promise<UserSessionEntity>;
    findByRefreshToken(refreshToken: string): Promise<UserSessionEntity | null>;
    findByUserId(userId: string): Promise<UserSessionEntity | null>;
    update(userSession: UserSessionEntity): Promise<UserSessionEntity>;
    delete(id: string): Promise<void>;
}