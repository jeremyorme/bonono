import { uuidv4 } from "../util/uuids";
import { IDbCollectionUpdater } from "./db-collection-updater";

export interface IDbCollection {
    insertOne(doc: any): Promise<string>;
    insertMany(docs: any[]): Promise<string[]>
    findOne(query: any): any;
    get all(): IterableIterator<[string, any]>;
    onUpdated(callback: () => void);
    canWrite(): boolean;
    address(): string;
    numEntries(): number;
}

export class DbCollection implements IDbCollection {
    constructor(private _updater: IDbCollectionUpdater) { }

    async insertOne(doc: any): Promise<string> {
        const docWithId = doc._id ? doc : { ...doc, _id: uuidv4() };
        await this._updater.add([docWithId]);
        return docWithId._id;
    }

    async insertMany(docs: any[]): Promise<string[]> {
        const docsWithId = docs.map(doc => doc._id ? doc : { ...doc, _id: uuidv4() });
        await this._updater.add(docsWithId);
        return docsWithId.map(doc => doc._id);
    }

    findOne(query: any): any {
        return query._id && Object.keys(query).length == 1 ? this._updater.index().get(query._id) : null;
    }

    public get all(): IterableIterator<[string, any]> {
        return this._updater.index().entries();
    }

    onUpdated(callback: () => void) { this._updater.onUpdated(callback); }

    canWrite(): boolean { return this._updater.canWrite(); }

    address(): string { return this._updater.address(); }

    numEntries(): number { return this._updater.numEntries(); }
}