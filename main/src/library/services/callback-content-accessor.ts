import { IContentAccessor } from "./content-accessor";

export class CallbackContentAccessor implements IContentAccessor {
    constructor(
        private _getObjectCb: (cid: string) => Promise<any>,
        private _putObjectCb: (obj: any) => Promise<string>) { }

    async getObject<T>(cid: string): Promise<T | null> {
        const obj = await this._getObjectCb(cid);
        return obj as T;
    }

    async putObject<T>(obj: T): Promise<string> {
        return this._putObjectCb(obj);
    }
}