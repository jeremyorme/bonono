import { IContentAccessor } from "./content-accessor";
import { read, write } from 'orbit-db-io';

export class IpfsContentAccessor implements IContentAccessor {
    constructor(private _ipfs: any, private _timeout: number) { }

    async getObject<T>(cid: string): Promise<T | null> {
        try {
            return (await read(this._ipfs, cid, { timeout: this._timeout }));
        }
        catch (_) {
            return null;
        }
    }

    async putObject<T>(obj: T): Promise<string> {
        return write(this._ipfs, 'dag-pb', obj);
    }
}