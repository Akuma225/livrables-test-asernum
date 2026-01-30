import { UserSessionEntity } from "src/domain/entities/user-session.entity";
import { IUserSessionRepository } from "src/domain/repositories/user-session.repository";
import { UserSessionRepositoryPort } from "src/domain/ports/user-session-repository.port";
import { prisma } from "../prisma/prisma";

export class UserSessionRepository extends UserSessionRepositoryPort implements IUserSessionRepository {
    async create(userSession: UserSessionEntity): Promise<UserSessionEntity> {
        return await prisma.user_sessions.create({
            data: {
                user_id: userSession.user_id,
                refresh_token: userSession.refresh_token,
                metadata: userSession.metadata,
                is_active: userSession.is_active,
            },
        }) as UserSessionEntity;
    }

    async findByRefreshToken(refreshToken: string): Promise<UserSessionEntity | null> {
        return await prisma.user_sessions.findFirst({
            where: {
                refresh_token: refreshToken,
            },
        }) as UserSessionEntity | null;
    }

    async findByUserId(userId: string): Promise<UserSessionEntity | null> {
        return await prisma.user_sessions.findFirst({
            where: {
                user_id: userId,
            },
        }) as UserSessionEntity | null;
    }

    async update(userSession: UserSessionEntity): Promise<UserSessionEntity> {
        return await prisma.user_sessions.update({
            where: {
                id: userSession.id,
            },
            data: {
                ...(userSession.refresh_token && { refresh_token: userSession.refresh_token }),
                ...(userSession.metadata && { metadata: userSession.metadata }),
                ...(userSession.is_active && { is_active: userSession.is_active }),
            },
        }) as UserSessionEntity;
    }

    async delete(id: string): Promise<void> {
        await prisma.user_sessions.delete({
            where: {
                id: id,
            },
        });
    }
}