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
import { MockLogSink } from '../test_util/mock-log-sink';

describe('db-collection-updater', () => {

    //
    // --- ctor ---
    //

    it('constructs', () => {
        // Construct an updater
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockCryptoProvider('test-id'), new MockLocalStorage(),
            null, _ => { }, _ => { }, defaultCollectionOptions);

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
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest with public ownership
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', '');
        expect(manifest).toHaveProperty('publicAccess', 'ReadWrite');
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Check write access is granted to the creator
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits new publicly writeable collection with own-key write access', async () => {
        // Construct an updater with public write access
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest with public ownership
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', '');
        expect(manifest).toHaveProperty('publicAccess', 'ReadAnyWriteOwn');
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });

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
        const updaterCreator: DbCollectionUpdater = new DbCollectionUpdater(
            content, cryptoCreator, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
        await updaterCreator.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1' without needing its address.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });

        // ---
        await updater.init('test');
        // ---

        // Check the address has not changed and points to a valid manifest with public ownership
        expect(updater.address()).toEqual(updaterCreator.address());
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', '');
        expect(manifest).toHaveProperty('publicAccess', 'ReadWrite');
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Check write access is granted to identity that is not the creator
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits existing empty publicly writeable collection with own-key write access', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Identity 'test-id-1' creates public store
        const cryptoCreator = new MockCryptoProvider('test-id-1');
        const updaterCreator: DbCollectionUpdater = new DbCollectionUpdater(
            content, cryptoCreator, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
        await updaterCreator.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1' without needing its address.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });

        // ---
        await updater.init('test');
        // ---

        // Check the address has not changed and points to a valid manifest with public ownership
        expect(updater.address()).toEqual(updaterCreator.address());
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty('name', 'test');
        expect(manifest).toHaveProperty('creatorPublicKey', '');
        expect(manifest).toHaveProperty('publicAccess', 'ReadAnyWriteOwn');
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
        await updaterOther.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, address: updaterOther.address() });

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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: 'the-key' }]);

        // Identity 'test-id-2' opens the store created by 'test-id-1' without needing its address.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, local,
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });

        // ---
        await updater.init('test');
        // ---

        // Check that the opened collection has the correct address
        expect(updater.address()).toEqual(updaterOther.address());

        // Check that 'test-id-2' sees the entry created by 'test-id-1'
        expect(updater.numEntries()).toEqual(1);
    });

    it('inits existing non-empty publicly writeable collection with own-key write access', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create common local storage to emulate sharing collections without pubsub
        const local = new MockLocalStorage();

        // Identity 'test-id-1' creates public store and adds an item
        const crypto_1 = new MockCryptoProvider('test-id-1');
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto_1, local,
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: await crypto_1.publicKey() }]);
        expect(updaterOther.numEntries()).toEqual(1);

        // Identity 'test-id-2' opens the store created by 'test-id-1' without needing its address.
        const crypto_2 = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto_2, local,
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });

        // ---
        await updater.init('test');
        // ---

        // Check that the opened collection has the correct address
        expect(updater.address()).toEqual(updaterOther.address());

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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: 'the-key' }]);

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, local,
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, address: updaterOther.address() });

        // ---
        await updater.init('test');
        // ---

        // Check that 'test-id-2' sees the entry created by 'test-id-1'
        expect(updater.numEntries()).toEqual(1);
    });

    it('inits existing non-empty private collection from creator public key', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create common local storage to emulate sharing collections without pubsub
        const local = new MockLocalStorage();

        // Identity 'test-id-1' creates private store and adds an item
        const cryptoOther = new MockCryptoProvider('test-id-1');
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, cryptoOther, local,
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: 'the-key' }]);

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const crypto = new MockCryptoProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, local,
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, creatorPublicKey: await cryptoOther.publicKey() });

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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, address: 'non-existent' });

        // ---
        const success = await updater.init('test');
        // ---

        // Check the updater failed to init
        expect(success).toBeFalsy();
    })

    //
    // --- close ---
    //

    it('closes', async () => {
        // We'll store the address given to the close callback in here
        let closeAddress = 'this-will-contain-the-close-address';

        // Construct an updater
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockCryptoProvider('test-id'), new MockLocalStorage(),
            null, _ => { }, a => { closeAddress = a }, defaultCollectionOptions);
        await updater.init('test');

        // ---
        updater.close();
        // ---

        // Check the close address matches the db updater address
        expect(closeAddress).toEqual(updater.address());
    });

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
            null, c => { collection = c; }, _ => { },
            { ...defaultCollectionOptions });
        await updater.init('test');
        let updatedValues: any[] = [];
        updater.onUpdated(() => { updatedValues = [...updater.index().values()]; });
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
        const publicKey = await crypto.publicKey();
        expect(updatedValues.length).toEqual(values.length);
        for (let i = 0; i < values.length; ++i)
            expect(updatedValues[i]).toEqual({ ...values[i], _clock: i + 1, _identity: { publicKey } });

        // Check the collection structure
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
            null, c => { collection = c; }, _ => { },
            { ...defaultCollectionOptions, complexity });
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
        const publicKey = await crypto.publicKey();
        for (let i = 0; i < values.length; ++i)
            expect(updater.index().get(values[i]._id)).toEqual({ ...values[i], _clock: i + 1, _identity: { publicKey } });

        // Check the collection structure
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
            null, c => { collection = c; }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.None });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });
        const publicKey = await crypto.publicKey();

        // The first value contains _clock and _identity as if it had come from a query
        // We want to check that these get stripped off prior to encryption.
        const values = [
            { _id: 'key-1', _clock: 1, _identity: { publicKey }, value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await updater.add(values);
        // ---

        // Check the entries were added
        expect(updater.numEntries()).toEqual(values.length);

        // Check the index was correctly populated
        for (let i = 0; i < values.length; ++i)
            expect(updater.index().get(values[i]._id)).toEqual({ ...values[i], _clock: i + 1, _identity: { publicKey } });

        // Check the collection structure
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
            delete payload._clock;
            delete payload._identity;
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
            null, c => { collection = c; }, _ => { },
            { ...defaultCollectionOptions, compactThreshold: 5, conflictResolution: ConflictResolution.LastWriteWins });
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
        const expectedIndex: Map<string, any> = new Map();
        const publicKey = await crypto.publicKey();
        let i = 0;
        for (const value of values)
            expectedIndex.set(value._id, { ...value, _clock: ++i, _identity: { publicKey } });
        for (const [id, value] of expectedIndex.entries())
            expect(updater.index().get(id)).toEqual(value);

        // Check the collection structure
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
            null, c => { collection = c; }, _ => { },
            { ...defaultCollectionOptions, compactThreshold: 5, conflictResolution: ConflictResolution.FirstWriteWins });
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

        // Check the index was correctly populated
        const expectedIndex: Map<string, any> = new Map();
        const publicKey = await crypto.publicKey();
        let i = 0;
        for (const value of values)
            if (!expectedIndex.has(value._id))
                expectedIndex.set(value._id, { ...value, _clock: ++i, _identity: { publicKey } });
        for (const [id, value] of expectedIndex.entries())
            expect(updater.index().get(id)).toEqual(value);

        // Check a second key-2 entry was not added
        expect(updater.numEntries()).toEqual(i);

        // Check the collection structure
        expect(collection).toHaveProperty('senderPublicKey', publicKey);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', 0);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', i);
        expect(entryBlockList).toHaveProperty('publicKey', publicKey);
        expect(entryBlockList).toHaveProperty('signature', await crypto.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(i);
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
            null, c => { collection = c; }, _ => { },
            { ...defaultCollectionOptions, compactThreshold: 4 });
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
        const expectedIndex: Map<string, any> = new Map();
        const publicKey = await crypto.publicKey();
        let i = 0;
        for (const value of values)
            expectedIndex.set(value._id, { ...value, _clock: ++i, _identity: { publicKey } });
        for (const [id, value] of expectedIndex.entries())
            expect(updater.index().get(id)).toEqual(value);

        // Check the collection structure
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
        await updaterOther.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1' and adds an item
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockCryptoProvider('test-id-2'), local,
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, address: updaterOther.address() });
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
            null, c => { collection = c; }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
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
        expect(collection).toHaveProperty('addCount', 1);
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

    it('does not add entry to read-any-write-own store when _id does not match self identity', async () => {
        // Identity 'test-id-1' creates read-any-write-own store
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockCryptoProvider('test-id-1'), new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadAnyWriteOwn });
        await updater.init('test');

        // ---
        await updater.add([{ _id: 'the-key' }]);
        // ---

        // Check the entry was not added
        expect(updater.numEntries()).toEqual(0);
    });

    it('does not add entries to index when the current clock has reached max clock', async () => {
        // Construct an updater with private write access and add an entry
        const crypto = new MockCryptoProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, upperClock: 0 });
        await updater.init('test');
        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await updater.add(values);
        // ---

        // Check the entries were not added
        expect(updater.numEntries()).toEqual(3);
        expect(updater.index().size).toEqual(0);
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
        await updater.init('test');
        let updatedValues: any[] = [];
        updater.onUpdated(() => { updatedValues = [...updater.index().values()]; });

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
        expect(updatedValues.length).toEqual(1);
        expect(updatedValues[0]).toEqual({ ...entry.value, _clock: 1, _identity: { publicKey } });
    });

    it('merges a valid collection into a non-empty collection', async () => {
        const content = new MockContentStorage();
        const crypto_a = new MockCryptoProvider('test-id-a');
        const publicKey_a = await crypto_a.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto_a, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
        await updater.init('test');
        let updatedValues: any[] = [];
        updater.onUpdated(() => { updatedValues = [...updater.index().values()]; });

        const entry_a: IEntry = { value: { _id: 'entry-a', _clock: 1 } };

        const collection_a: ICollection = {
            senderPublicKey: publicKey_a,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry_a]], content, crypto_a)],
            addCount: 1
        };

        await updater.merge(collection_a);

        const entry_b: IEntry = { value: { _id: 'entry-b', _clock: 2 } };

        const crypto_b = new MockCryptoProvider('test-id-b');
        const publicKey_b = await crypto_b.publicKey();
        const collection_b: ICollection = {
            senderPublicKey: publicKey_b,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry_b]], content, crypto_b)],
            addCount: 1
        };

        // ---
        await updater.merge(collection_b);
        // ---

        expect(updater.numEntries()).toEqual(2);
        expect(updater.index().has('entry-a')).toBeTruthy();
        expect(updater.index().has('entry-b')).toBeTruthy();
        expect(updatedValues.length).toEqual(2);
        expect(updatedValues[0]).toEqual({ ...entry_a.value, _clock: 1, _identity: { publicKey: publicKey_a } });
        expect(updatedValues[1]).toEqual({ ...entry_b.value, _clock: 2, _identity: { publicKey: publicKey_b } });
    });

    it('merges entries with same clock in public key order', async () => {
        const content = new MockContentStorage();
        const crypto_a = new MockCryptoProvider('test-id-a');
        const crypto_b = new MockCryptoProvider('test-id-b');
        const publicKey_a = await crypto_a.publicKey();
        const publicKey_b = await crypto_b.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto_a, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
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

    it('merges entries with different clocks in clock order', async () => {
        const content = new MockContentStorage();
        const crypto_a = new MockCryptoProvider('test-id-a');
        const crypto_b = new MockCryptoProvider('test-id-b');

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto_a, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, publicAccess: AccessRights.ReadWrite });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });

        const key_x = 'x';
        const key_y = 'y';

        const value_a = 'a';
        const value_b = 'b';

        const entry_a1: IEntry = { value: { _id: key_x, _clock: 1, value: value_a } as IObject }; // A: x = a
        const entry_b1: IEntry = { value: { _id: key_x, _clock: 2, value: value_b } as IObject }; // B: x = b
        const entry_b2: IEntry = { value: { _id: key_y, _clock: 3, value: value_b } as IObject }; // B: y = b
        const entry_a2: IEntry = { value: { _id: key_y, _clock: 4, value: value_a } as IObject }; // A: y = a

        const collection: ICollection = {
            senderPublicKey: await crypto_a.publicKey(),
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([[entry_a1, entry_a2]], content, crypto_a), await makeEntryBlockList([[entry_b1, entry_b2]], content, crypto_b)],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(4);
        expect(updater.index().has(key_x)).toBeTruthy();
        expect(updater.index().get(key_x)).toHaveProperty('value', value_b);
        expect(updater.index().has(key_y)).toBeTruthy();
        expect(updater.index().get(key_y)).toHaveProperty('value', value_a);
        expect(updated).toBeTruthy();
    });

    it('merges a valid collection requiring proof of work into an empty collection', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const complexity = 4;
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(), new ConsoleLogSink(),
            _ => { }, _ => { },
            { ...defaultCollectionOptions, complexity });
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, conflictResolution: ConflictResolution.LastWriteWins });
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
        expect(updater.index().get('entry-0')).toEqual({ ...entries[1].value, _identity: { publicKey } });
        expect(updated).toBeTruthy();
    });

    it('fails to overwrite value for a key when merging with first write wins', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const log = new MockLogSink();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(), log, _ => { }, _ => { },
            { ...defaultCollectionOptions, conflictResolution: ConflictResolution.FirstWriteWins });
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

        expect(updater.numEntries()).toEqual(0);
        expect(updater.index().has('entry-0')).toBeFalsy();
        expect(updated).toBeFalsy();

        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing entry block list with multiple writes with the same _id in first-write-wins mode was ignored (address = ' + updater.address() + ')');
    });

    it('does not merge an invalid collection', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
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
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions });
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

    it('does index merged entries with clock values that are out of range', async () => {
        const content = new MockContentStorage();
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, crypto, new MockLocalStorage(),
            null, _ => { }, _ => { },
            { ...defaultCollectionOptions, lowerClock: 2, upperClock: 4 });
        await updater.init('test');
        let updatedValues: any[] = [];
        updater.onUpdated(() => { updatedValues = [...updater.index().values()]; });

        const entries: IEntry[] = [
            { value: { _id: 'entry-1', _clock: 1 } },
            { value: { _id: 'entry-2', _clock: 2 } },
            { value: { _id: 'entry-3', _clock: 3 } },
            { value: { _id: 'entry-4', _clock: 4 } }
        ];

        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: updater.address(),
            entryBlockLists: [await makeEntryBlockList([entries], content, crypto)],
            addCount: 4
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(4);
        expect(updater.index().has('entry-1')).toBeFalsy();
        expect(updater.index().has('entry-2')).toBeTruthy();
        expect(updater.index().has('entry-3')).toBeTruthy();
        expect(updater.index().has('entry-4')).toBeFalsy();
        expect(updatedValues.length).toEqual(2);
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
            null, c => { collection = c }, _ => { },
            { ...defaultCollectionOptions });
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
