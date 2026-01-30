import { CommandBase } from "src/common/cqrs/command-base";
import { CreateFolderDto } from "src/application/dto/folders/create-folder.dto";

export class CreateFolderCommand extends CommandBase<CreateFolderDto & { user_id: string }> {
    readonly payload: CreateFolderDto & { user_id: string };

    constructor(data: CreateFolderDto & { user_id: string }) {
        super();
        this.payload = data;
    }
}
