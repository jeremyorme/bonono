import { uuidv4 } from "../util/uuids";
import { IDbCollectionUpdater } from "./db-collection-updater";

/**
 * Interface for querying and updating a collection.
 */
export interface IDbCollection {
    /**
     * Inserts a single object into the collection.
     * 
     * @remarks The `doc` object is inserted under the key in its `_id` property.
     * If `doc` does not contain `_id` then an auto-generated UUID is used.
     * 
     * @param doc Object to insert
     * @returns The supplied or generated key
     */
    insertOne(doc: any): Promise<string>;

    /**
     * Inserts a multiple objects into the collection.
     * 
     * @remarks Each object in `docs` is inserted under the key in its `_id` property.
     * If the object does not contain `_id` then an auto-generated UUID is used.
     * 
     * @param docs Array of objects to insert
     * @returns Array of supplied or generated keys
     */
    insertMany(docs: any[]): Promise<string[]>

    /**
     * Finds and returns an object in the collection.
     * 
     * @remarks Currently only index search is supported so the query object must be
     * of the form `{_id: key}` where `key` is the same key supplied to and/or returned
     * by {@link IDbCollection.insertOne} or {@link IDbCollection.insertMany}.
     * 
     * @param query Query object containing search criteria
     * @returns The first matching object, or null if none was found
     */
    findOne(query: any): any;

    /**
     * Gets an iterator over all items in the collection.
     * 
     * @returns Iterator over all items in the collection
     */
    get all(): IterableIterator<[string, any]>;

    /**
     * Registers a callback to be notified following an update.
     * 
     * @remarks An update may occur due to a local modification (e.g. from a call to
     * {@link IDbCollection.insertOne} or {@link IDbCollection.insertMany}) or as a
     * result of remote updates being merged into the local replica.
     * 
     * @param callback Callback function
     */
    onUpdated(callback: () => void);

    /**
     * Gets whether the current identity has read access to the store.
     * 
     * @returns true if read access granted, otherwise false
     */
    canRead(): boolean;

    /**
     * Gets whether the current identity has write access to the store.
     * 
     * @returns true if write access granted, otherwise false
     */
    canWrite(): boolean;

    /** 
     * Gets the address of this store.
     * 
     * @remarks The store address is defined as the CID of its manifest
     * 
     * @returns Store address
     */
    address(): string;

    /**
     * Gets the number of entries.
     * 
     * @remarks At any given point, the number of entries may exceed the number of
     * keys as prior values are retained until store compaction occurs.
     * 
     * @returns Number of entries
     */
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

    canRead(): boolean { return this._updater.canRead(); }

    canWrite(): boolean { return this._updater.canWrite(); }

    address(): string { return this._updater.address(); }

    numEntries(): number { return this._updater.numEntries(); }
}