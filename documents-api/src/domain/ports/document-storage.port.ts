export abstract class DocumentStoragePort {
    abstract upload(key: string, buffer: Buffer, contentType: string): Promise<any>;
    abstract getSignedUrl(key: string, expires?: number): Promise<string>;
    abstract getSignedUrlFromProduction(key: string, expires?: number): Promise<string>;
    abstract getSignedUrlFromTrash(key: string, expires?: number): Promise<string>;
    abstract downloadFromProduction(key: string): Promise<{ buffer: Buffer; contentType?: string }>;
    abstract delete(key: string): Promise<any>;
    abstract deleteFromProduction(key: string): Promise<any>;
    abstract deleteFromTrash(key: string): Promise<any>;
    abstract moveProductionToTrash(key: string): Promise<void>;
    abstract moveTrashToProduction(key: string): Promise<void>;
}
