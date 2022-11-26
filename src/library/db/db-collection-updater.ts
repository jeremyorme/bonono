import { ICollectionOptions, defaultCollectionOptions, validateCollectionOptions } from '../private-data/collection-options';
import { areEntryBlocksValid, IEntryBlockList, isEntryBlockListValid } from '../public-data/entry-block-list';
import { ICollectionManifest, isCollectionManifestValid } from '../public-data/collection-manifest';
import { ICollection, isCollectionValid } from '../public-data/collection';
import { IEntryBlock } from '../public-data/entry-block';
import { IEntry } from '../public-data/entry';
import { byClock, byPublicKey } from '../util/sort-comparators';
import { mergeArrays } from '../util/arrays';
import { IContentAccessor } from '../services/content-accessor';
import { ICryptoProvider } from '../services/crypto-provider';
import { ILocalStorage } from '../services/local-storage';
import { AccessRights } from '../public-data/access-rights';
import { IObject } from '../public-data/object';
import { ILogSink } from '../services/log-sink';
import { ConflictResolution } from '../public-data/conflict-resolution';

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

interface IEntryBlockListUpdate {
    publicKey: string;
    updated: IEntryBlockList;
    original?: IEntryBlockList;
    updatedBlocks?: (IEntryBlock | null)[];
    originalBlocks?: (IEntryBlock | null)[];
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
    private _selfPublicKey: string = '';

    constructor(
        private _contentAccessor: IContentAccessor,
        private _cryptoProvider: ICryptoProvider,
        private _localStorage: ILocalStorage,
        private _log: ILogSink | null,
        private _publish: (ICollection) => void,
        options: Partial<ICollectionOptions>) {
        this._options = { ...defaultCollectionOptions, ...options };
        validateCollectionOptions(this._options);
    }

    async init(name: string): Promise<boolean> {

        this._selfPublicKey = await this._cryptoProvider.publicKey();

        var manifest: ICollectionManifest | null;
        if (this._options.address) {
            this._address = this._options.address;
            manifest = await this._contentAccessor.getObject<ICollectionManifest>(this._address);
            if (manifest == null || !isCollectionManifestValid(manifest, this._address, this._log))
                return false;
            this._manifest = manifest;
        }
        else {
            this._manifest = {
                name,
                creatorPublicKey: this._selfPublicKey,
                publicAccess: this._options.publicAccess,
                entryBlockSize: this._options.entryBlockSize,
                conflictResolution: this._options.conflictResolution,
                complexity: this._options.complexity
            };
            this._address = await this._contentAccessor.putObject(this._manifest);
        }

        const collectionCid = await this._localStorage.getItem('/db/' + this._address);
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

        // Validate the collection
        if (!await isCollectionValid(collection, this._address, this._log))
            return;

        // Determine which entry block lists have been updated since last time
        const entryBlockListUpdates = collection.entryBlockLists
            .map(entryBlockList => (<IEntryBlockListUpdate>{ publicKey: entryBlockList.publicKey, updated: entryBlockList, original: this._entryBlockLists.get(entryBlockList.publicKey) }))
            .filter(entryBlockListUpdate => !entryBlockListUpdate.original || entryBlockListUpdate.updated.clock > entryBlockListUpdate.original.clock);
        if (entryBlockListUpdates.length == 0)
            return;

        // Validate the new blocks
        const blocksValid = await Promise.all(entryBlockListUpdates.map(
            entryBlockListUpdate => isEntryBlockListValid(entryBlockListUpdate.updated, this._cryptoProvider, this._manifest, this._address, this._log)));
        if (!blocksValid.every(b => b))
            return;

        // Generate merged entry block lists sorted by public key
        const mergedEntryBlockListUpdates: Map<string, Partial<IEntryBlockListUpdate>> = new Map();
        this._entryBlockLists.forEach((v, k) => mergedEntryBlockListUpdates.set(k, { original: v }));
        for (const entryBlockListUpdate of entryBlockListUpdates)
            mergedEntryBlockListUpdates.set(entryBlockListUpdate.updated.publicKey, entryBlockListUpdate);
        const sortedMergedEntryBlockListUpdates = Array.from(mergedEntryBlockListUpdates.values()).sort(byPublicKey);

        // Try to load the entry blocks
        for (const entryBlockListUpdate of sortedMergedEntryBlockListUpdates.values()) {
            if (entryBlockListUpdate.original)
                entryBlockListUpdate.originalBlocks = await Promise.all(entryBlockListUpdate.original.entryBlockCids.map(
                    entryBlockCid => this._contentAccessor.getObject<IEntryBlock>(entryBlockCid)));
            if (entryBlockListUpdate.updated)
                entryBlockListUpdate.updatedBlocks = await Promise.all(entryBlockListUpdate.updated.entryBlockCids.map(
                    entryBlockCid => this._contentAccessor.getObject<IEntryBlock>(entryBlockCid)));
        }

        // Validate the updated entry blocks
        if (!(await Promise.all(sortedMergedEntryBlockListUpdates.map(async entryBlockListUpdate => {
            return !!entryBlockListUpdate.updated && !!entryBlockListUpdate.updatedBlocks && await areEntryBlocksValid(
                entryBlockListUpdate.updatedBlocks,
                entryBlockListUpdate.originalBlocks ? entryBlockListUpdate.originalBlocks : [],
                entryBlockListUpdate.updated,
                this._cryptoProvider,
                this._address,
                this._manifest,
                this._log);
        }))).every(x => x))
            return;

        // Everything loaded ok so complete update and return early if reindexing not needed
        mergedEntryBlockListUpdates.forEach((v, k) => {
            if (v.updated)
                this._entryBlockLists.set(k, v.updated);
        });
        if (!await this._updateCollectionCid())
            return;

        // Regenerate the index and update the current clock
        const entryBlocks = mergeArrays(sortedMergedEntryBlockListUpdates.map(x => x.updatedBlocks ? x.updatedBlocks : x.originalBlocks ? x.originalBlocks : []));
        const allEntries = mergeArrays(entryBlocks.map(entryBlock => entryBlock ? entryBlock.entries : []));
        this._numEntries = allEntries.length;

        if (allEntries.length > 0)
            this._clock = allEntries.slice(-1)[0].clock;
        if (this._manifest.conflictResolution == ConflictResolution.FirstWriteWins)
            allEntries.reverse();

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

        // Store collection locally with all the entry block lists we have
        const collection: ICollection = {
            senderPublicKey: this._selfPublicKey,
            address: this._address,
            entryBlockLists: Array.from(this._entryBlockLists.values()),
            addCount: this._addCount
        };
        const newCollectionCid = await this._contentAccessor.putObject(collection);

        // If the CID didn't change, the content is identical so nothing more to do
        if (newCollectionCid == this._collectionCid)
            return false;

        // Otherwise, store the new CID
        this._collectionCid = newCollectionCid;
        if (!await this._localStorage.setItem('/db/' + this._address, this._collectionCid))
            return false;

        // If our entry block list was updated, publish it for other peers to merge
        const myEntryBlockList = this._entryBlockLists.get(this._selfPublicKey);
        if (myEntryBlockList != null) {
            this._publish({
                senderPublicKey: this._selfPublicKey,
                address: this._address,
                entryBlockLists: [myEntryBlockList],
                addCount: this._addCount
            });
        }

        // Notify the update locally
        for (const cb of this._updatedCallbacks)
            cb();

        return true;
    }

    async add(objs: any[]): Promise<void> {

        if (!this.canWrite() || objs.length == 0)
            return;

        const makeEntry = async (obj: IObject) => {
            const entry: IEntry = { clock: ++this._clock, value: obj };
            if (this._manifest.complexity > 0) {
                const [signature, nonce] = await this._cryptoProvider.sign_complex(entry, this._address, this._manifest.complexity);
                entry.proofOfWork = { signature, nonce };
            }
            return entry;
        }

        var myEntryBlockList: IEntryBlockList;
        const lastWriteWins = this._manifest.conflictResolution == ConflictResolution.LastWriteWins;
        if (this._manifest.publicAccess == AccessRights.ReadAnyWriteOwn) {
            var obj = objs[lastWriteWins ? objs.length - 1 : 0];

            if (obj._id != this._selfPublicKey)
                return;

            if (lastWriteWins || !this._index.has(obj._id))
                this._index.set(obj._id, obj);
            this._numEntries = 1;

            const entry: IEntry = await makeEntry(obj);
            const entryBlock: IEntryBlock = { entries: [entry] };
            const entryBlockCid = await this._contentAccessor.putObject(entryBlock);
            myEntryBlockList = {
                entryBlockCids: [entryBlockCid],
                clock: 0,
                publicKey: this._selfPublicKey,
                signature: ''
            };
            this._entryBlockLists.set(this._selfPublicKey, myEntryBlockList);
        }
        else {
            for (const obj of objs)
                if (lastWriteWins || !this._index.has(obj._id))
                    this._index.set(obj._id, obj);
            this._numEntries += objs.length;

            const maybeMyEntryBlockList = this._entryBlockLists.get(this._selfPublicKey);
            if (maybeMyEntryBlockList) {
                myEntryBlockList = maybeMyEntryBlockList;
            }
            else {
                myEntryBlockList = {
                    entryBlockCids: [],
                    clock: 0,
                    publicKey: this._selfPublicKey,
                    signature: ''
                };
                this._entryBlockLists.set(this._selfPublicKey, myEntryBlockList);
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
            let newBlockEntries = [...lastEntries, ...await Promise.all(encryptedObjs.map(obj => makeEntry(obj)))];

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
        }

        myEntryBlockList.clock = this._clock;
        myEntryBlockList.signature = '';
        myEntryBlockList.signature = await this._cryptoProvider.sign(myEntryBlockList);
        await this._updateCollectionCid();
    }

    onPeerJoined(_peer: string) {
        if (this._entryBlockLists.size > 0) {
            let collection: ICollection = {
                senderPublicKey: this._selfPublicKey,
                address: this._address,
                entryBlockLists: Array.from(this._entryBlockLists.values()),
                addCount: this._addCount
            };
            this._publish(collection);
        }
    };

    onUpdated(callback: () => void) { this._updatedCallbacks.push(callback); }

    canRead(): boolean {
        return this._selfPublicKey == this._manifest.creatorPublicKey ||
            this._manifest.publicAccess != AccessRights.None;
    }

    canWrite(): boolean {
        return this._selfPublicKey == this._manifest.creatorPublicKey ||
            this._manifest.publicAccess == AccessRights.ReadWrite;
    }

    address(): string { return this._address; }

    index(): Map<string, any> { return this._index; }

    numEntries(): number { return this._numEntries; }
}