import { CommandBase } from "src/common/cqrs/command-base";

export class DeleteFolderCommand extends CommandBase<{ id: string; user_id: string }> {
    readonly payload: { id: string; user_id: string };

    constructor(data: { id: string; user_id: string }) {
        super();
        this.payload = data;
    }
}
