import { UserEntity } from "src/domain/entities/user.entity";
import { IUserRepository } from "src/domain/repositories/user.repository";
import { UserRepositoryPort } from "src/domain/ports/user-repository.port";
import { prisma } from "../prisma/prisma";

export class UserRepository extends UserRepositoryPort implements IUserRepository {
    async create(user: UserEntity): Promise<UserEntity> {
        return await prisma.users.create({
            data: user,
        }) as UserEntity;
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return await prisma.users.findUnique({
            where: {
                email: email,
            },
        }) as UserEntity | null;
    }

    async findById(id: string): Promise<UserEntity | null> {
        return await prisma.users.findUnique({
            where: {
                id: id,
            },
        }) as UserEntity | null;
    }
}