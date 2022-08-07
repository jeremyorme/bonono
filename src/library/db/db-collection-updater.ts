import { ICollectionOptions, defaultCollectionOptions, validateCollectionOptions } from "../private-data/collection-options";
import { IEntryBlockList } from "../public-data/entry-block-list";
import { ICollectionManifest, isCollectionManifestValid } from "../private-data/collection-manifest";
import { ICollection, isCollectionValid } from "../public-data/collection";
import { IEntryBlock, areEntryBlocksValid } from "../public-data/entry-block";
import { IEntry } from "../public-data/entry";
import { byClock, byOwnerIdentity } from "../util/sort-comparators";
import { mergeArrays } from "../util/arrays";
import { IContentAccessor } from "../services/content-accessor";
import { ICryptoProvider } from "../services/crypto-provider";
import { ILocalStorage } from "../services/local-storage";
import { AccessRights } from "../private-data/access-rights";
import { IObject } from "../public-data/object";

export interface IDbCollectionUpdater {
    init(name: string): Promise<boolean>;
    merge(collection: ICollection): Promise<void>;
    add(objs: any[]): Promise<void>;
    onPeerJoined(_peer: string);
    onUpdated(callback: () => void);
    canRead(): boolean;
    canWrite(): boolean;
    address(): string;
    index(): Map<string, any>;
    numEntries(): number;
}

export class DbCollectionUpdater implements IDbCollectionUpdater {
    private _options: ICollectionOptions;
    private _address: string;
    private _manifest: ICollectionManifest;
    private _index: Map<string, any> = new Map();
    private _clock: number = 0;
    private _entryBlockLists: Map<string, IEntryBlockList> = new Map();
    private _collectionCid: string;
    private _updatedCallbacks: Array<() => void> = [];
    private _addCount: number = 0;
    private _numEntries: number = 0;
    private _selfIdentity: string = '';
    private _selfPublicKey: string = '';

    constructor(
        private _contentAccessor: IContentAccessor,
        private _cryptoProvider: ICryptoProvider,
        private _localStorage: ILocalStorage,
        private _publish: (ICollection) => void,
        options: Partial<ICollectionOptions>) {
        this._options = { ...defaultCollectionOptions, ...options };
        validateCollectionOptions(this._options);
    }

    async init(name: string): Promise<boolean> {

        this._selfIdentity = await this._cryptoProvider.id();
        this._selfPublicKey = await this._cryptoProvider.publicKey();

        var manifest: ICollectionManifest | null;
        if (this._options.address) {
            this._address = this._options.address;
            manifest = await this._contentAccessor.getObject<ICollectionManifest>(this._address);
            if (manifest == null || !isCollectionManifestValid(manifest, this._address))
                return false;
            this._manifest = manifest;
        }
        else {
            this._manifest = {
                name,
                creatorIdentity: this._selfIdentity,
                publicAccess: this._options.publicAccess,
                entryBlockSize: this._options.entryBlockSize
            };
            this._address = await this._contentAccessor.putObject(this._manifest);
        }

        const collectionCid = this._localStorage.getItem('/db/' + this._address);
        if (collectionCid) {
            const collection = await this._contentAccessor.getObject<ICollection>(collectionCid);
            if (collection) {
                this._addCount = collection.addCount;
                await this.merge(collection);
            }
        }

        return true;
    }

    async merge(collection: ICollection): Promise<void> {

        if (!await isCollectionValid(collection, this._cryptoProvider, this._manifest, this._address))
            return;

        // Determine which entry block lists are new
        const isEntryBlockListNew = (entryBlockList: IEntryBlockList) => {
            const existingEntryBlockList = this._entryBlockLists.get(entryBlockList.ownerIdentity);
            return !existingEntryBlockList || entryBlockList.clock > existingEntryBlockList.clock;
        };
        const newEntryBlockLists = collection.entryBlockLists.filter(entryBlockList => isEntryBlockListNew(entryBlockList));
        if (newEntryBlockLists.length == 0)
            return;
        const newEntryBlockOwners: Set<string> = new Set(newEntryBlockLists.map(
            newEntryBlockList => newEntryBlockList.ownerIdentity));

        // Generate merged entry block lists sorted by owner
        const mergedEntryBlockLists: Map<string, IEntryBlockList> = new Map(this._entryBlockLists);
        for (const newEntryBlockList of newEntryBlockLists)
            mergedEntryBlockLists.set(newEntryBlockList.ownerIdentity, newEntryBlockList);
        const sortedMergedEntryBlockLists = Array.from(mergedEntryBlockLists.values()).sort(byOwnerIdentity);

        // Try to load the entry blocks
        const sortedMergedEntryBlocks = await Promise.all(sortedMergedEntryBlockLists.map(newEntryBlockList =>
            Promise.all(newEntryBlockList.entryBlockCids.map(
                entryBlockCid => this._contentAccessor.getObject<IEntryBlock>(entryBlockCid)))));

        // Validate the entry blocks
        for (let i = 0; i < sortedMergedEntryBlockLists.length; ++i) {
            const entryBlockList = sortedMergedEntryBlockLists[i];
            const entryBlocks = sortedMergedEntryBlocks[i];
            const isNew = newEntryBlockOwners.has(entryBlockList.ownerIdentity);

            // Full validation for new block
            if (isNew && !areEntryBlocksValid(entryBlockList, entryBlocks, this._address))
                return;

            // Basic null-check for old block
            if (!isNew && entryBlocks.some(entryBlock => !entryBlock))
                return;
        }

        // Everything loaded ok so complete update and return early if reindexing not needed
        this._entryBlockLists = mergedEntryBlockLists;
        if (!await this._updateCollectionCid())
            return;

        // Regenerate the index and update the current clock
        const entryBlocks = mergeArrays(sortedMergedEntryBlocks);
        const allEntries = mergeArrays(entryBlocks.map(entryBlock => entryBlock ? entryBlock.entries : []));
        this._numEntries = allEntries.length;

        allEntries.sort(byClock);
        if (allEntries.length > 0)
            this._clock = allEntries.slice(-1)[0].clock;

        this._index.clear();
        if (this._manifest.publicAccess != AccessRights.None) {
            for (const entry of allEntries)
                this._index.set(entry.value._id, entry.value);
        }
        else {
            for (const entry of allEntries) {
                const obj = {
                    _id: await this._cryptoProvider.decrypt(entry.value._id),
                    ...JSON.parse(await this._cryptoProvider.decrypt(entry.value['payload']))
                };
                this._index.set(obj._id, obj);
            }
        }
    }

    private async _updateCollectionCid(): Promise<boolean> {
        const collection: ICollection = {
            senderIdentity: this._selfIdentity,
            address: this._address,
            entryBlockLists: Array.from(this._entryBlockLists.values()).sort(byOwnerIdentity),
            addCount: this._addCount
        };

        const newCollectionCid = await this._contentAccessor.putObject(collection);

        if (newCollectionCid == this._collectionCid)
            return false;

        this._collectionCid = newCollectionCid;
        this._localStorage.setItem('/db/' + this._address, this._collectionCid);
        this._publish(collection);
        for (const cb of this._updatedCallbacks)
            cb();

        return true;
    }

    async add(objs: any[]): Promise<void> {

        if (!this.canWrite())
            return;

        for (const obj of objs)
            this._index.set(obj._id, obj);
        this._numEntries += objs.length;

        var myEntryBlockList: IEntryBlockList;
        const maybeMyEntryBlockList = this._entryBlockLists.get(this._selfIdentity);
        if (maybeMyEntryBlockList) {
            myEntryBlockList = maybeMyEntryBlockList;
        }
        else {
            myEntryBlockList = {
                ownerIdentity: this._selfIdentity,
                entryBlockCids: [],
                clock: 0,
                publicKey: this._selfPublicKey,
                signature: ''
            };
            this._entryBlockLists.set(this._selfIdentity, myEntryBlockList);
        }

        var lastBlock: IEntryBlock = { entries: [] };
        if (myEntryBlockList.entryBlockCids.length > 0) {
            const maybeLastBlock = await this._contentAccessor.getObject<IEntryBlock>(myEntryBlockList.entryBlockCids.slice(-1)[0]);
            if (!maybeLastBlock)
                return;
            lastBlock = maybeLastBlock;
        }

        const removeId = (obj: IObject): any => {
            const clone: any = { ...obj };
            delete clone._id;
            return clone;
        }

        const encrypt = async (obj: IObject): Promise<any> => {
            return this._manifest.publicAccess == AccessRights.None ? {
                _id: await this._cryptoProvider.encrypt(obj._id),
                payload: await this._cryptoProvider.encrypt(JSON.stringify(removeId(obj)))
            } : obj;
        }

        const lastEntries = lastBlock.entries.length != this._options.entryBlockSize ? lastBlock.entries : [];
        const encryptedObjs = await Promise.all(objs.map(obj => encrypt(obj)));
        let newBlockEntries = [...lastEntries, ...encryptedObjs.map(obj => ({ value: obj, clock: ++this._clock }))];

        const newBlocks: IEntryBlock[] = [];
        while (newBlockEntries.length > 0) {
            newBlocks.push({ entries: newBlockEntries.slice(0, this._options.entryBlockSize) });
            newBlockEntries = newBlockEntries.slice(this._options.entryBlockSize);
        }

        const newBlockCids = await Promise.all(newBlocks.map(eb => this._contentAccessor.putObject(eb)));
        const oldBlockCids = lastEntries.length > 0 ?
            myEntryBlockList.entryBlockCids.slice(0, myEntryBlockList.entryBlockCids.length - 1) :
            myEntryBlockList.entryBlockCids;

        myEntryBlockList.entryBlockCids = [...oldBlockCids, ...newBlockCids];

        this._addCount += objs.length;
        if (this._addCount >= this._options.compactThreshold) {
            this._addCount %= this._options.compactThreshold;
            let myEntryBlocks = await Promise.all(myEntryBlockList.entryBlockCids.map(entryBlockCid => this._contentAccessor.getObject<IEntryBlock>(entryBlockCid)));
            const myEntries: IEntry[] = mergeArrays(myEntryBlocks.map(eb => eb ? eb.entries : []));

            const myEffectiveEntryMap: Map<string, IEntry> = new Map();
            for (const entry of myEntries)
                myEffectiveEntryMap.set(entry.value._id, entry);
            const myEffectiveEntries = Array.from(myEffectiveEntryMap.values());
            this._numEntries += myEffectiveEntries.length - myEntries.length;

            myEntryBlocks = [];
            let sortedEntries = myEffectiveEntries.sort(byClock);
            while (sortedEntries.length > 0) {
                myEntryBlocks.push({ entries: sortedEntries.slice(0, this._options.entryBlockSize) });
                sortedEntries = sortedEntries.slice(this._options.entryBlockSize);
            }

            myEntryBlockList.entryBlockCids = await Promise.all(myEntryBlocks.map(eb => this._contentAccessor.putObject(eb)));
        }

        myEntryBlockList.clock = this._clock;
        myEntryBlockList.signature = '';
        myEntryBlockList.signature = await this._cryptoProvider.sign(myEntryBlockList);

        await this._updateCollectionCid();
    }

    onPeerJoined(_peer: string) {
        if (this._entryBlockLists.size > 0)
            this._publish({
                senderIdentity: this._selfIdentity,
                address: this._address,
                entryBlockLists: Array.from(this._entryBlockLists.values()),
                addCount: this._addCount
            });
    };

    onUpdated(callback: () => void) { this._updatedCallbacks.push(callback); }

    canRead(): boolean {
        return this._selfIdentity == this._manifest.creatorIdentity ||
            this._manifest.publicAccess != AccessRights.None;
    }

    canWrite(): boolean {
        return this._selfIdentity == this._manifest.creatorIdentity ||
            this._manifest.publicAccess == AccessRights.ReadWrite;
    }

    address(): string { return this._address; }

    index(): Map<string, any> { return this._index; }

    numEntries(): number { return this._numEntries; }
}