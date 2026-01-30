import { CommandBase } from "src/common/cqrs/command-base";

export class MoveDocumentCommand extends CommandBase<{ id: string; folder_id: string; user_id: string }> {
    readonly payload: { id: string; folder_id: string; user_id: string };

    constructor(data: { id: string; folder_id: string; user_id: string }) {
        super();
        this.payload = data;
    }
}

