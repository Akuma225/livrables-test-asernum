export abstract class QueryBase<T = any> {
    readonly params?: T | undefined;
    readonly id?: string | undefined;
    
    // For audit purposes
    readonly requestedAt: Date;

    constructor(data: { params?: T | undefined, id?: string | undefined }) {
        this.params = data.params ?? ({} as T);
        this.id = data.id ?? undefined;
        this.requestedAt = new Date();
    }
}  