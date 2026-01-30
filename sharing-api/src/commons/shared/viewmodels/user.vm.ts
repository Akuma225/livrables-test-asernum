import { BaseVm } from "@akuma225/viewmodel";
import { ApiResponseProperty } from "@nestjs/swagger";
import { UserEntity } from "../entities/user.entity";

export class UserVm extends BaseVm {
    @ApiResponseProperty()
    id: string;

    @ApiResponseProperty()
    firstname: string;

    @ApiResponseProperty()
    lastname: string;

    @ApiResponseProperty()
    email: string;

    @ApiResponseProperty()
    is_active: boolean;

    constructor(data: UserEntity) {
        super(data);
        this.id = data.id;
        this.firstname = data.firstname;
        this.lastname = data.lastname;
        this.email = data.email;
        this.is_active = data.is_active;
    }
}