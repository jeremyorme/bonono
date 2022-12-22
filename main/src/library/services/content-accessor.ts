export interface IContentAccessor {
    getObject<T>(cid: string): Promise<T | null>;
    putObject<T>(obj: T): Promise<string>;
}