import { CommandBase } from "src/common/cqrs/command-base";
import { UpdateFolderDto } from "src/application/dto/folders/update-folder.dto";

export class UpdateFolderCommand extends CommandBase<UpdateFolderDto & { id: string; user_id: string }> {
    readonly payload: UpdateFolderDto & { id: string; user_id: string };

    constructor(data: UpdateFolderDto & { id: string; user_id: string }) {
        super();
        this.payload = data;
    }
}
