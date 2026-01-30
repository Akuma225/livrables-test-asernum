import { NotFoundException } from "@nestjs/common";
import { FindUserByIdQuery } from "./find-user-by-id.query";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { UserEntity } from "src/domain/entities/user.entity";
import { UserRepositoryPort } from "src/domain/ports/user-repository.port";

@QueryHandler(FindUserByIdQuery)
export class FindUserByIdQueryHandler implements IQueryHandler<FindUserByIdQuery> {
    constructor(private readonly userRepository: UserRepositoryPort) {}

    async execute(query: FindUserByIdQuery): Promise<UserEntity> {
        let user = await this.userRepository.findById(query.id ?? '');
        if (!user) {
            throw new NotFoundException('L\'utilisateur n\'a pas été trouvé');
        }
        return user;
    }
}