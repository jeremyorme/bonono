import { defaultCollectionOptions } from '../../library/private-data/collection-options';
import { DbCollectionUpdater } from '../../library/db/db-collection-updater';
import { MockContentStorage } from '../test_util/mock-content-storage';
import { MockCryptoProvider } from '../test_util/mock-crypto-provider';
import { ICollectionManifest } from '../../library/public-data/collection-manifest';
import { MockLocalStorage } from '../test_util/mock-local-storage';
import { ICollection } from '../../library/public-data/collection';
import { IEntryBlock } from '../../library/public-data/entry-block';
import { IEntryBlockList } from '../../library/public-data/entry-block-list';
import { IEntry } from '../../library/public-data/entry';
import { makeEntryBlockList } from '../test_util/collection-utils';
import { AccessRights } from '../../library/public-data/access-rights';
import { ConflictResolution } from '../../library/public-data/conflict-resolution';
import { IObject } from '../../library/public-data/object';
import { ConsoleLogSink } from '../../library/services/console-log-sink';

describe('db-collection-updater', () => {

    //
    // --- ctor ---
    //

    it('constructs', () => {
        // Construct an updater
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockCryptoProvider('test-id'), new MockLocalStorage(),
            null, _ => { }, defaultCollectionOptions);

        // Check it is valid
        expect(updater).toBeTruthy();
        expect(updater.address()).toBeFalsy();
    });

    //
    // --- init ---
    //

    it('inits new publicly writeable collection', async () => {
        // Construct an updater with public write access
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest with public ownership
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', publicKey);
        expect(manifest).toHaveProperty('publicAccess', 'ReadWrite');
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Check write access is granted to the creator
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits new private collection', async () => {
        // Construct an updater with private write access
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest owned by the creator
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', publicKey);
        expect(manifest).toHaveProperty('publicAccess', 'Read');
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Check write access is granted to the creator (owner)
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits existing empty publicly writeable collection', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Identity 'test-id-1' creates public store
        const cryptoCreator = new MockCryptoProvider('test-id-1');
        const publicKeyCreator = await cryptoCreator.publicKey();
        const updaterCreator: DbCollectionUpdater = new DbCollectionUpdater(
            content, cryptoCreator, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
        await updaterCreator.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, address: updaterCreator.address() });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest with public ownership
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', publicKeyCreator);
        expect(manifest).toHaveProperty('publicAccess', 'ReadWrite');
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Check write access is granted to identity that is not the creator
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits existing empty private collection', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Identity 'test-id-1' creates private store
        const cryptoCreator = new MockCryptoProvider('test-id-1');
        const publicKeyCreator = await cryptoCreator.publicKey();
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, cryptoCreator, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });
        await updaterOther.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest owned by the creator
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', publicKeyCreator);
        expect(manifest).toHaveProperty('publicAccess', 'Read');
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Check write access is not granted to identity that is not the creator (owner)
        expect(updater.canWrite()).toEqual(false);
    });

    it('inits existing non-empty publicly writeable collection', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create common local storage to emulate sharing collections without pubsub
        const local = new MockLocalStorage();

        // Identity 'test-id-1' creates public store and adds an item
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockCryptoProvider('test-id-1'), local,
            null, _ => { }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: 'the-key' }]);

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, local,
            null, _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });

        // ---
        await updater.init('test');
        // ---

        // Check that 'test-id-2' sees the entry created by 'test-id-1'
        expect(updater.numEntries()).toEqual(1);
    });

    it('inits existing non-empty private collection', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create common local storage to emulate sharing collections without pubsub
        const local = new MockLocalStorage();

        // Identity 'test-id-1' creates private store and adds an item
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockCryptoProvider('test-id-1'), local,
            null, _ => { }, { ...defaultCollectionOptions });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: 'the-key' }]);

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, local,
            null, _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });

        // ---
        await updater.init('test');
        // ---

        // Check that 'test-id-2' sees the entry created by 'test-id-1'
        expect(updater.numEntries()).toEqual(1);
    });

    it('inits non-existent collection', async () => {
        // Create updater with non-existent address
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockCryptoProvider('test-id'), new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, address: 'non-existent' });

        // ---
        const success = await updater.init('test');
        // ---

        // Check the updater failed to init
        expect(success).toBeFalsy();
    })

    //
    // --- add ---
    //

    it('adds entries when write access is granted', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const crypto = new MockCryptoProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });
        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await updater.add(values);
        // ---

        // Check the entries were added
        expect(updater.numEntries()).toEqual(values.length);

        // Check the index was correctly populated
        for (let i = 0; i < values.length; ++i)
            expect(updater.index().get(values[i]._id)).toHaveProperty('value', values[i].value);

        // Check the collection structure
        const publicKey = await crypto.publicKey();
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', { ...values[i], _clock: i + 1 });
        }

        // Check we were notified
        expect(updated).toBeTruthy();
    });

    it('adds entries with required proof of work', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const crypto = new MockCryptoProvider('test-id');
        const content = new MockContentStorage();
        const complexity = 4;
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions, complexity });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });
        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await updater.add(values);
        // ---

        // Check the entries were added
        expect(updater.numEntries()).toEqual(values.length);

        // Check the index was correctly populated
        for (let i = 0; i < values.length; ++i)
            expect(updater.index().get(values[i]._id)).toHaveProperty('value', values[i].value);

        // Check the collection structure
        const publicKey = await crypto.publicKey();
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', { ...values[i], _clock: i + 1 });
            expect(entries[i]).toHaveProperty('proofOfWork');
            const proofOfWork = entries[i].proofOfWork;
            if (proofOfWork) {
                expect(crypto.verify_complex(
                    { value: { ...entries[i].value, clock: entries[i].value._clock } },
                    proofOfWork.signature,
                    entryBlockList.publicKey,
                    updater.address(),
                    proofOfWork.nonce,
                    complexity)).toBeTruthy();
            }
        }

        // Check we were notified
        expect(updated).toBeTruthy();
    });

    it('adds entries when encryption is enabled', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const crypto = new MockCryptoProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions, publicAccess: AccessRights.None });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });
        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await updater.add(values);
        // ---

        // Check the entries were added
        expect(updater.numEntries()).toEqual(values.length);

        // Check the index was correctly populated
        for (let i = 0; i < values.length; ++i)
            expect(updater.index().get(values[i]._id)).toHaveProperty('value', values[i].value);

        // Check the collection structure
        const publicKey = await crypto.publicKey();
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        const encrypt = async obj => {
            const payload = { ...obj };
            const id = payload._id;
            delete payload._id;
            return {
                _id: await crypto.encrypt(id),
                payload: await crypto.encrypt(JSON.stringify(payload))
            }
        }
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', { ...await encrypt(values[i]), _clock: i + 1 });
        }

        // Check we were notified
        expect(updated).toBeTruthy();
    });

    it('overwrites value in index when adding subsequent entry with existing key using last write wins', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const crypto = new MockCryptoProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions, compactThreshold: 5, conflictResolution: ConflictResolution.LastWriteWins });
        await updater.init('test');
        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 },
            { _id: 'key-2', value: 4 }];
        await updater.add(values.slice(0, -1));

        // ---
        await updater.add(values.slice(-1));
        // ---

        // Check the entries were added
        expect(updater.numEntries()).toEqual(values.length);

        // Check the index was correctly populated
        const expectedIndex: Map<string, number> = new Map();
        for (const value of values)
            expectedIndex.set(value._id, value.value);
        for (const [id, value] of expectedIndex.entries())
            expect(updater.index().get(id))
                .toHaveProperty('value', value);

        // Check the collection structure
        const publicKey = await crypto.publicKey();
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', { ...values[i], _clock: i + 1 });
        }
    });

    it('does not overwrite value in index when adding subsequent entry with existing key using first write wins', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const crypto = new MockCryptoProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions, compactThreshold: 5, conflictResolution: ConflictResolution.FirstWriteWins });
        await updater.init('test');
        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 },
            { _id: 'key-2', value: 4 }];
        await updater.add(values.slice(0, -1));

        // ---
        await updater.add(values.slice(-1));
        // ---

        // Check the entries were added
        expect(updater.numEntries()).toEqual(values.length);

        // Check the index was correctly populated
        const expectedIndex: Map<string, number> = new Map();
        for (const value of [...values].reverse())
            expectedIndex.set(value._id, value.value);
        for (const [id, value] of expectedIndex.entries())
            expect(updater.index().get(id))
                .toHaveProperty('value', value);

        // Check the collection structure
        const publicKey = await crypto.publicKey();
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', { ...values[i], _clock: i + 1 });
        }
    });

    it('removes redundant entries when the compact threshold is reached', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const crypto = new MockCryptoProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions, compactThreshold: 4 });
        await updater.init('test');
        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 },
            { _id: 'key-2', value: 4 }];
        await updater.add(values.slice(0, -1));

        // ---
        await updater.add(values.slice(-1));
        // ---

        // Check the entries were added
        expect(updater.numEntries()).toEqual(values.length - 1);

        // Check the index was correctly populated
        const expectedIndex: Map<string, number> = new Map();
        for (const value of values)
            expectedIndex.set(value._id, value.value);
        for (let i = 0; i < expectedIndex.entries.length; ++i)
            expect(updater.index().get(expectedIndex.entries[i]._id))
                .toHaveProperty('value', expectedIndex.entries[i].value);

        // Check the collection structure
        const publicKey = await crypto.publicKey();
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', 0);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length - 1);
        expect(entryBlock.entries[0]).toHaveProperty('value', { ...values[0], _clock: 1 });
        expect(entryBlock.entries[1]).toHaveProperty('value', { ...values[2], _clock: 3 });
        expect(entryBlock.entries[2]).toHaveProperty('value', { ...values[3], _clock: 4 });
    });

    it('does not add entry when write access is not granted', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create common local storage to emulate sharing collections without pubsub
        const local = new MockLocalStorage();

        // Identity 'test-id-1' creates private store
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockCryptoProvider('test-id-1'), local,
            null, _ => { }, { ...defaultCollectionOptions });
        await updaterOther.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1' and adds an item
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockCryptoProvider('test-id-2'), local,
            null, _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });
        await updater.init('test');

        // ---
        await updater.add([{ _id: 'the-key' }]);
        // ---

        // Check the entry was not added
        expect(updater.numEntries()).toEqual(0);
    });

    it('does add entry to read-any-write-own store when _id matches self identity', async () => {
        const crypto = new MockCryptoProvider('test-id-1');

        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Identity 'test-id-1' creates read-any-write-own store
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
        await updater.init('test');
        const publicKey = await crypto.publicKey();
        const value = { _id: publicKey, value: 'my-data' }

        // ---
        await updater.add([value]);
        // ---

        // Check the entry was not added
        expect(updater.numEntries()).toEqual(1);

        // Check the index was correctly populated
        expect(updater.index().get(publicKey))
            .toHaveProperty('value', 'my-data');

        // Check the collection structure
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', 0);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', 1);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(1);
        expect(entryBlock.entries[0]).toHaveProperty('value', { ...value, _clock: 1 });
    });

    it('does not exceed one entry in a read-any-write-own store after more than one add', async () => {
        const crypto = new MockCryptoProvider('test-id-1');

        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderPublicKey: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Identity 'test-id-1' creates read-any-write-own store
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c; }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
        await updater.init('test');
        const publicKey = await crypto.publicKey();
        await updater.add([{ _id: publicKey, value: 'the-first-value' }]);
        const value = { _id: publicKey, value: 'my-data' }

        // ---
        await updater.add([value]);
        // ---

        // Check the entry was not added
        expect(updater.numEntries()).toEqual(1);

        // Check the index was correctly populated
        expect(updater.index().get(publicKey))
            .toHaveProperty('value', 'my-data');

        // Check the collection structure
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', 0);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', 2);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(1);
        expect(entryBlock.entries[0]).toHaveProperty('value', { ...value, _clock: 2 });
    });

    it('does not add entry to read-any-write-own store when _id does not match self identity', async () => {
        // Identity 'test-id-1' creates read-any-write-own store
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockCryptoProvider('test-id-1'), new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
        await updater.init('test');

        // ---
        await updater.add([{ _id: 'the-key' }]);
        // ---

        // Check the entry was not added
        expect(updater.numEntries()).toEqual(0);
    });

    it('adds last object to read-any-write-own store with last write wins', async () => {
        const crypto = new MockCryptoProvider('test-id-1');

        // Identity 'test-id-1' creates read-any-write-own store
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
        await updater.init('test');
        const publicKey = await crypto.publicKey();
        const firstValue = 'my-data';
        const lastValue = 'my-data-2';

        // ---
        await updater.add([
            { _id: publicKey, value: firstValue },
            { _id: publicKey, value: lastValue }
        ]);
        // ---

        // Check no entry was not added
        expect(updater.numEntries()).toEqual(1);
        expect(updater.index().has(publicKey)).toBeTruthy();
        expect(updater.index().get(publicKey)).toHaveProperty('value', lastValue);
    });

    it('adds first object to read-any-write-own store with first write wins', async () => {
        const crypto = new MockCryptoProvider('test-id-1');

        // Identity 'test-id-1' creates read-any-write-own store
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn, conflictResolution: ConflictResolution.FirstWriteWins });
        await updater.init('test');
        const publicKey = await crypto.publicKey();
        const firstValue = 'my-data';
        const lastValue = 'my-data-2';

        // ---
        await updater.add([
            { _id: publicKey, value: firstValue },
            { _id: publicKey, value: lastValue }
        ]);
        // ---

        // Check no entry was not added
        expect(updater.numEntries()).toEqual(1);
        expect(updater.index().has(publicKey)).toBeTruthy();
        expect(updater.index().get(publicKey)).toHaveProperty('value', firstValue);
    });

    //
    // --- merge ---
    //

    it('merges a valid collection into an empty collection', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });

        const entry: IEntry = { value: { _id: 'entry-0', _clock: 1 } };

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry]], content, crypto)],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(1);
        expect(updater.index().has('entry-0')).toBeTruthy();
        expect(updated).toBeTruthy();
    });

    it('merges entries with same clock in public key order', async () => {
        const content = new MockContentStorage();
        const crypto_a = new MockCryptoProvider('test-id-a');
        const crypto_b = new MockCryptoProvider('test-id-b');
        const publicKey_a = await crypto_a.publicKey();
        const publicKey_b = await crypto_b.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto_a, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });

        const key = 'entry';
        const value_a = 'a';
        const entry_a: IEntry = { value: { _id: key, _clock: 1, value: value_a } as IObject };

        const value_b = 'b';
        const entry_b: IEntry = { value: { _id: key, _clock: 1, value: value_b } as IObject };

        const collection: ICollection = {
            senderPublicKey: publicKey_a,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry_b]], content, crypto_b), await makeEntryBlockList([[entry_a]], content, crypto_a)],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(2);
        expect(updater.index().has(key)).toBeTruthy();
        expect(updater.index().get(key)).toHaveProperty('value', publicKey_a > publicKey_b ? value_a : value_b);
        expect(updated).toBeTruthy();
    });

    it('merges a valid collection requiring proof of work into an empty collection', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const complexity = 4;
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(), new ConsoleLogSink(),
            _ => { }, { ...defaultCollectionOptions, complexity });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });

        const entry: IEntry = { value: { _id: 'entry-0', _clock: 1 } };
        const [signature, nonce] = await crypto.sign_complex(entry, updater.address(), complexity);
        entry.proofOfWork = { signature, nonce };

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry]], content, crypto)],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(1);
        expect(updater.index().has('entry-0')).toBeTruthy();
        expect(updated).toBeTruthy();
    });

    it('sets the last value for a key when merging with last write wins', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, conflictResolution: ConflictResolution.LastWriteWins });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });

        const entries: IEntry[] = [
            { value: { _id: 'entry-0', _clock: 1, val: 1 } as IObject },
            { value: { _id: 'entry-0', _clock: 2, val: 2 } as IObject }];

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([entries], content, crypto)],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(2);
        expect(updater.index().has('entry-0')).toBeTruthy();
        expect(updater.index().get('entry-0')).toEqual(entries[1].value);
        expect(updated).toBeTruthy();
    });

    it('sets the first value for a key when merging with first write wins', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions, conflictResolution: ConflictResolution.FirstWriteWins });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });

        const entries: IEntry[] = [
            { value: { _id: 'entry-0', _clock: 1, val: 1 } as IObject },
            { value: { _id: 'entry-0', _clock: 2, val: 2 } as IObject }];

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([entries], content, crypto)],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(2);
        expect(updater.index().has('entry-0')).toBeTruthy();
        expect(updater.index().get('entry-0')).toEqual(entries[0].value);
        expect(updated).toBeTruthy();
    });

    it('does not merge an invalid collection', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = { value: { _id: 'entry-0', _clock: 1 } };

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry]], content, crypto)]
        } as ICollection;

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(0);
    });

    it('does not merge an entry block list that is not new', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry1: IEntry = { value: { _id: 'entry-0', _clock: 1 } };

        const collection1: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry1]], content, crypto)],
            addCount: 1
        };

        await updater.merge(collection1);

        const entry2: IEntry = { value: { _id: 'entry-1', _clock: 1 } };

        const collection2: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry2]], content, crypto)],
            addCount: 1
        };

        // ---
        await updater.merge(collection2);
        // ---

        expect(updater.numEntries()).toEqual(1);
        expect(updater.index().has('entry-0')).toBeTruthy();
        expect(!updater.index().has('entry-1')).toBeTruthy();
    });

    it('does not merge a collection with an invalid entry block list', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = { value: { _id: 'entry-0', _clock: 1 } };

        const entryBlock: IEntryBlock = { entries: [entry] };

        const entryBlockList: IEntryBlockList = {
            entryBlockCids: [await content.putObject(entryBlock)],
            clock: 1,
            publicKey,
            signature: ''
        };

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [entryBlockList],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(0);
    });

    it('does not merge a collection with an invalid entry block', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = { value: { _id: 'entry-0', _clock: 1 } };

        const entryBlock: IEntryBlock = { entries: [entry], rogueProperty: true } as IEntryBlock;

        const entryBlockList: IEntryBlockList = {
            entryBlockCids: [await content.putObject(entryBlock)],
            clock: 1,
            publicKey,
            signature: ''
        };
        entryBlockList.signature = await crypto.sign(entryBlockList);

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [entryBlockList],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(0);
    });

    it('does not merge a collection with an unfetchable entry block', async () => {
        const content = new MockContentStorage();
        const wrongContent = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = { value: { _id: 'entry-0', _clock: 1 } };

        const entryBlock: IEntryBlock = { entries: [entry] } as IEntryBlock;

        const entryBlockList: IEntryBlockList = {
            entryBlockCids: [await wrongContent.putObject(entryBlock)],
            clock: 1,
            publicKey,
            signature: ''
        };
        entryBlockList.signature = await crypto.sign(entryBlockList);

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [entryBlockList],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(0);
    });

    //
    // -- onPeerJoined
    //

    it('publishes a collection when a peer joins', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {} as ICollection;

        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, c => { collection = c }, { ...defaultCollectionOptions });
        await updater.init('test');

        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];
        await updater.add(values);

        collection = {} as ICollection;

        // ---
        updater.onPeerJoined('peer-42');
        // ---

        // Check the collection structure
        const publicKey = await crypto.publicKey();
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', { ...values[i], _clock: i + 1 });
        }
    });
});
