import { UserEntity } from "../entities/user.entity";
import { IUserRepository } from "../repositories/user.repository";

export abstract class UserRepositoryPort implements IUserRepository {
    abstract create(user: UserEntity): Promise<UserEntity>;
    abstract findByEmail(email: string): Promise<UserEntity | null>;
    abstract findById(id: string): Promise<UserEntity | null>;
}
