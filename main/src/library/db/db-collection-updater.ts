import { ICollectionOptions, defaultCollectionOptions, validateCollectionOptions } from '../private-data/collection-options';
import { areEntryBlocksValid, IEntryBlockList, isEntryBlockListValid } from '../public-data/entry-block-list';
import { ICollectionManifest, isCollectionManifestValid } from '../public-data/collection-manifest';
import { ICollection, isCollectionValid } from '../public-data/collection';
import { IEntryBlock } from '../public-data/entry-block';
import { IEntry } from '../public-data/entry';
import { entryByClock, byUpdatedPublicKey } from '../util/sort-comparators';
import { mergeArrays } from '../util/arrays';
import { IContentAccessor } from '../services/content-accessor';
import { ICryptoProvider } from '../services/crypto-provider';
import { ILocalStorage } from '../services/local-storage';
import { AccessRights } from '../public-data/access-rights';
import { ILogSink } from '../services/log-sink';
import { ConflictResolution } from '../public-data/conflict-resolution';
import { IIdentity } from '../private-data/identity';
import { IProof } from '../public-data/proof';

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
    close();
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
    private _selfIdentity: IIdentity = { publicKey: '' };
    private _identityCache: Map<string, IIdentity> = new Map();

    constructor(
        private _contentAccessor: IContentAccessor,
        private _cryptoProvider: ICryptoProvider,
        private _localStorage: ILocalStorage,
        private _log: ILogSink | null,
        private _publish: (ICollection) => void,
        private _close: (string) => void,
        options: Partial<ICollectionOptions>) {
        this._options = { ...defaultCollectionOptions, ...options };
        validateCollectionOptions(this._options);
    }

    close() {
        this._close(this._address);
    }

    async init(name: string): Promise<boolean> {

        this._selfIdentity.publicKey = await this._cryptoProvider.publicKey();

        var manifest: ICollectionManifest | null;
        if (this._options.address) {
            manifest = await this._contentAccessor.getObject<ICollectionManifest>(this._options.address);
            if (manifest == null || !isCollectionManifestValid(manifest, this._options.address, this._log))
                return false;
            this._manifest = manifest;
            this._address = this._options.address;
        }
        else {
            const hasPrivateWriteAccess =
                this._options.publicAccess == AccessRights.Read ||
                this._options.publicAccess == AccessRights.None;

            const creatorPublicKey = this._options.creatorPublicKey ?
                this._options.creatorPublicKey :
                hasPrivateWriteAccess ? this._selfIdentity.publicKey : '';

            this._manifest = {
                name,
                creatorPublicKey,
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
            .map(entryBlockList => (<IEntryBlockListUpdate>{ updated: entryBlockList, original: this._entryBlockLists.get(entryBlockList.publicKey) }))
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
        const sortedMergedEntryBlockListUpdates = Array.from(mergedEntryBlockListUpdates.values()).sort(byUpdatedPublicKey);

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
            return !entryBlockListUpdate.updated ||
                !!entryBlockListUpdate.updatedBlocks && await areEntryBlocksValid(
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
        const addIdentity = (entry: IEntry, publicKey: string | undefined) => {
            if (!publicKey)
                return entry;
            let _identity: IIdentity | undefined = this._identityCache.get(publicKey);
            if (!_identity) {
                _identity = { publicKey };
                this._identityCache.set(publicKey, _identity);
            }
            return { ...entry, _identity };
        };

        const allEntries = mergeArrays(sortedMergedEntryBlockListUpdates.map(u =>
            u.updatedBlocks ? mergeArrays(u.updatedBlocks.map(b => b ? b.entries.map(e => addIdentity(e, u.updated?.publicKey)) : [])) :
                u.originalBlocks ? mergeArrays(u.originalBlocks.map(b => b ? b.entries.map(e => addIdentity(e, u.original?.publicKey)) : [])) : [])).sort(entryByClock);

        this._numEntries = allEntries.length;

        if (allEntries.length > 0)
            this._clock = allEntries.slice(-1)[0]._clock;
        if (this._manifest.conflictResolution == ConflictResolution.FirstWriteWins)
            allEntries.reverse();

        this._index.clear();
        if (this._manifest.publicAccess != AccessRights.None) {
            for (const entry of allEntries)
                if (this._clockInRange(entry._clock))
                    this._index.set(entry._id, entry);
        }
        else {
            for (const entry of allEntries) {
                const obj = {
                    _id: await this._cryptoProvider.decrypt(entry._id),
                    ...JSON.parse(await this._cryptoProvider.decrypt(entry['payload'])),
                    _identity: entry['_identity']
                };
                if (obj._clock >= this._options.lowerClock && (this._options.upperClock == -1 || obj._clock < this._options.upperClock))
                    this._index.set(obj._id, obj);
            }
        }

        this._notifyUpdated();
    }

    private async _updateCollectionCid(): Promise<boolean> {

        // Store collection locally with all the entry block lists we have
        const collection: ICollection = {
            senderPublicKey: this._selfIdentity.publicKey,
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

        return true;
    }

    private _notifyUpdated() {
        // Notify the update locally
        for (const cb of this._updatedCallbacks)
            cb();
    }

    private _clockInRange(clock: number): boolean {
        return (clock >= this._options.lowerClock &&
            (this._options.upperClock == -1 || clock < this._options.upperClock));
    }

    async add(entries: any[]): Promise<void> {

        if (!this.canWrite() || entries.length == 0)
            return;

        // For ReadAnyWriteOwn collection, filter out entries not keyed by own public key
        const isReadAnyWriteOwn = this._manifest.publicAccess == AccessRights.ReadAnyWriteOwn;
        const validEntries = entries.filter(e => !isReadAnyWriteOwn || e._id == this._selfIdentity.publicKey);

        // Add clocks and make two copies (public and private)
        const publicEntries = validEntries.map(e => ({ ...e, _clock: ++this._clock }));
        const privateEntries = publicEntries.map(e => ({ ...e }));

        // Get (or create new) and set own entry block list
        const myEntryBlockList = this._entryBlockLists.get(this._selfIdentity.publicKey) || {
            entryBlockCids: [],
            clock: 0,
            publicKey: this._selfIdentity.publicKey,
            signature: ''
        };
        this._entryBlockLists.set(this._selfIdentity.publicKey, myEntryBlockList);

        // Get entries contained in the last partial block, if there is one
        var lastEntries: IEntry[] = [];
        if (myEntryBlockList.entryBlockCids.length > 0) {
            const maybeLastBlock = await this._contentAccessor.getObject<IEntryBlock>(myEntryBlockList.entryBlockCids.slice(-1)[0]);
            if (maybeLastBlock && maybeLastBlock.entries.length != this._options.entryBlockSize)
                lastEntries = maybeLastBlock.entries;
        }

        // Helper to remove properties that should be excluded from encryption
        const removeSpecialProperties = (entry: IEntry): any => {
            const clone: any = { ...entry };
            delete clone._id;
            delete clone._clock;
            delete clone._proof;
            delete clone._identity;
            return clone;
        }

        for (let i = 0; i < validEntries.length; ++i) {
            // Encrypt id and data of public entry if public access is forbidden
            if (this._manifest.publicAccess == AccessRights.None) {
                const e = publicEntries[i];
                e._id = await this._cryptoProvider.encrypt(e._id);
                e.payload = await this._cryptoProvider.encrypt(JSON.stringify(removeSpecialProperties(e)));
            }

            // Add proof to public and private entries, if required
            // If complexity > 0, always add (proofs of work are non-portable)
            // If complexity == 0, add if not already present, otherwise keep existing proof
            if (this._manifest.complexity > 0 || !publicEntries[i]._proof && this._manifest.complexity == 0) {
                // Strip _proof and _identity before signing
                const entryStripped = { ...publicEntries[i] };
                delete entryStripped._proof;
                delete entryStripped._identity;

                // If portable, strip clock before signing
                if (this._manifest.complexity == 0)
                    delete entryStripped._clock;

                // If portable, don't include collection address in signature
                const prefix = this._manifest.complexity > 0 ? this._address : '';

                // Sign and generate proof
                const [signature, nonce] = await this._cryptoProvider.sign_complex(entryStripped, prefix, this._manifest.complexity);
                const proof: IProof = { signature, nonce };

                // If portable, include signer's public key in proof
                if (this._manifest.complexity == 0)
                    proof.publicKey = this._selfIdentity.publicKey;

                publicEntries[i]._proof = privateEntries[i]._proof = proof;
            }
        }

        // Add to index entries within clock range
        const entriesInRange = privateEntries.filter(e => this._clockInRange(e._clock));
        for (const e of entriesInRange)
            if (this._manifest.conflictResolution != ConflictResolution.FirstWriteWins || !this._index.has(e._id))
                this._index.set(e._id, { ...e, _identity: this._selfIdentity });

        // Create array of entries to be written in new blocks (encrypt new entries as needed)
        let newBlockEntries = [...lastEntries, ...publicEntries];

        // Split into blocks
        const newBlocks: IEntryBlock[] = [];
        while (newBlockEntries.length > 0) {
            newBlocks.push({ entries: newBlockEntries.slice(0, this._options.entryBlockSize) });
            newBlockEntries = newBlockEntries.slice(this._options.entryBlockSize);
        }

        // Store the blocks to get their CIDs and update the CIDs in the entry block list
        const newBlockCids = await Promise.all(newBlocks.map(eb => this._contentAccessor.putObject(eb)));
        const oldBlockCids = lastEntries.length > 0 ?
            myEntryBlockList.entryBlockCids.slice(0, myEntryBlockList.entryBlockCids.length - 1) :
            myEntryBlockList.entryBlockCids;
        myEntryBlockList.entryBlockCids = [...oldBlockCids, ...newBlockCids];

        // Update the entry count
        this._numEntries += publicEntries.length;

        // Only do compaction if threshold is positive
        if (this._options.compactThreshold > 0) {

            this._addCount += publicEntries.length;

            // Only do compaction if threshold was reached/exceeded
            if (this._addCount >= this._options.compactThreshold) {

                this._addCount %= this._options.compactThreshold;
                let myEntryBlocks = await Promise.all(myEntryBlockList.entryBlockCids.map(entryBlockCid => this._contentAccessor.getObject<IEntryBlock>(entryBlockCid)));
                const myEntries: IEntry[] = mergeArrays(myEntryBlocks.map(eb => eb ? eb.entries : []));

                const myEffectiveEntryMap: Map<string, IEntry> = new Map();
                if (this._manifest.conflictResolution == ConflictResolution.FirstWriteWins)
                    myEntries.reverse();
                for (const entry of myEntries)
                    myEffectiveEntryMap.set(entry._id, entry);
                const myEffectiveEntries = Array.from(myEffectiveEntryMap.values());
                this._numEntries += myEffectiveEntries.length - myEntries.length;

                myEntryBlocks = [];
                let sortedEntries = myEffectiveEntries.sort(entryByClock);
                while (sortedEntries.length > 0) {
                    myEntryBlocks.push({ entries: sortedEntries.slice(0, this._options.entryBlockSize) });
                    sortedEntries = sortedEntries.slice(this._options.entryBlockSize);
                }

                myEntryBlockList.entryBlockCids = await Promise.all(myEntryBlocks.map(eb => this._contentAccessor.putObject(eb)));
            }
        }

        // Sign the entry block list
        myEntryBlockList.clock = this._clock;
        myEntryBlockList.signature = '';
        myEntryBlockList.signature = await this._cryptoProvider.sign(myEntryBlockList);

        if (!await this._updateCollectionCid())
            return;

        // Our entry block list was updated so publish it for other peers to merge
        this._publish({
            senderPublicKey: this._selfIdentity.publicKey,
            address: this._address,
            entryBlockLists: [myEntryBlockList],
            addCount: this._addCount
        });

        // Notify local listeners
        this._notifyUpdated();
    }

    onPeerJoined(_peer: string) {
        if (this._entryBlockLists.size > 0) {
            let collection: ICollection = {
                senderPublicKey: this._selfIdentity.publicKey,
                address: this._address,
                entryBlockLists: Array.from(this._entryBlockLists.values()),
                addCount: this._addCount
            };
            this._publish(collection);
        }
    };

    onUpdated(callback: () => void) { this._updatedCallbacks.push(callback); }

    canRead(): boolean {
        return this._selfIdentity.publicKey == this._manifest.creatorPublicKey ||
            this._manifest.publicAccess != AccessRights.None;
    }

    canWrite(): boolean {
        return this._selfIdentity.publicKey == this._manifest.creatorPublicKey ||
            this._manifest.publicAccess == AccessRights.ReadWrite ||
            this._manifest.publicAccess == AccessRights.ReadAnyWriteOwn;
    }

    address(): string { return this._address; }

    index(): Map<string, any> { return this._index; }

    numEntries(): number { return this._numEntries; }
}