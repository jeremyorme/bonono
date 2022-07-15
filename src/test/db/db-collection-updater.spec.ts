import { defaultCollectionOptions } from "../../library/private-data/collection-options";
import { DbCollectionUpdater } from "../../library/db/db-collection-updater";
import { MockContentStorage } from "../test_util/mock-content-storage";
import { MockSigningProvider } from "../test_util/mock-signing-provider";
import { ICollectionManifest } from "../../library/private-data/collection-manifest";
import { MockLocalStorage } from "../test_util/mock-local-storage";
import { ICollection } from "../../library/public-data/collection";
import { IEntryBlock } from "../../library/public-data/entry-block";
import { IEntryBlockList } from "../../library/public-data/entry-block-list";
import { IEntry } from "../../library/public-data/entry";
import { make_entry_block_list } from "../test_util/collection-utils";

describe('db-collection-updater', () => {

    //
    // --- ctor ---
    //

    it('constructs', () => {
        // Construct an updater
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockSigningProvider('test-id'), new MockLocalStorage(), _ => { }, defaultCollectionOptions);

        // Check it is valid
        expect(updater).toBeTruthy();
        expect(updater.address()).toBeFalsy();
    });

    //
    // --- init ---
    //

    it('inits new public collection', async () => {
        // Construct an updater with public write access
        const content = new MockContentStorage();
        const signing = new MockSigningProvider('test-id');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(), _ => { }, { ...defaultCollectionOptions, isPublic: true });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest with public ownership
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty("name", "test");
        expect(manifest).toHaveProperty("ownerIdentity", "*");

        // Check write access is granted to the creator
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits new private collection', async () => {
        // Construct an updater with private write access
        const content = new MockContentStorage();
        const id = 'test-id';
        const signing = new MockSigningProvider(id);
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(), _ => { }, { ...defaultCollectionOptions });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest owned by the creator
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty("name", "test");
        expect(manifest).toHaveProperty("ownerIdentity", id);

        // Check write access is granted to the creator (owner)
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits existing empty public collection', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Identity 'test-id-1' creates public store
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockSigningProvider('test-id-1'), new MockLocalStorage(), _ => { }, { ...defaultCollectionOptions, isPublic: true });
        await updaterOther.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const signing = new MockSigningProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(), _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest with public ownership
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty("name", "test");
        expect(manifest).toHaveProperty("ownerIdentity", "*");

        // Check write access is granted to identity that is not the creator
        expect(updater.canWrite()).toEqual(true);
    });

    it('inits existing empty private collection', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Identity 'test-id-1' creates private store
        const id = 'test-id-1';
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockSigningProvider(id), new MockLocalStorage(), _ => { }, { ...defaultCollectionOptions });
        await updaterOther.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const signing = new MockSigningProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(), _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });

        // ---
        await updater.init('test');
        // ---

        // Check the address points to a valid manifest owned by the creator
        expect(updater.address()).toBeTruthy();
        const manifest = await content.getObject<ICollectionManifest>(updater.address());
        expect(manifest).toBeTruthy();
        expect(manifest).toHaveProperty("name", "test");
        expect(manifest).toHaveProperty("ownerIdentity", id);

        // Check write access is not granted to identity that is not the creator (owner)
        expect(updater.canWrite()).toEqual(false);
    });

    it('inits existing non-empty public collection', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create common local storage to emulate sharing collections without pubsub
        const local = new MockLocalStorage();

        // Identity 'test-id-1' creates public store and adds an item
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockSigningProvider('test-id-1'), local, _ => { }, { ...defaultCollectionOptions, isPublic: true });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: 'the-key' }]);

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const signing = new MockSigningProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, local, _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });

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
            content, new MockSigningProvider('test-id-1'), local, _ => { }, { ...defaultCollectionOptions });
        await updaterOther.init('test');
        await updaterOther.add([{ _id: 'the-key' }]);

        // Identity 'test-id-2' opens the store created by 'test-id-1'.
        const signing = new MockSigningProvider('test-id-2');
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, local, _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });

        // ---
        await updater.init('test');
        // ---

        // Check that 'test-id-2' sees the entry created by 'test-id-1'
        expect(updater.numEntries()).toEqual(1);
    });

    it('inits non-existent collection', async () => {
        // Create updater with non-existent address
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockSigningProvider('test-id'),
            new MockLocalStorage(), _ => { },
            { ...defaultCollectionOptions, address: 'non-existent' });

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
            senderIdentity: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const signing = new MockSigningProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            c => { collection = c; }, { ...defaultCollectionOptions });
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
        const id = await signing.id();
        expect(collection).toHaveProperty('senderIdentity', id);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('ownerIdentity', id);
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', await signing.publicKey());
        expect(entryBlockList).toHaveProperty('signature', await signing.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', values[i]);
            expect(entries[i]).toHaveProperty('clock', i + 1);
        }

        // Check we were notified
        expect(updated).toBeTruthy();
    });

    it('overwrites value in index when adding subsequent entry with existing key', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderIdentity: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const signing = new MockSigningProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            c => { collection = c; }, { ...defaultCollectionOptions, compactThreshold: 5 });
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
        for (let i = 0; i < expectedIndex.entries.length; ++i)
            expect(updater.index().get(expectedIndex.entries[i]._id))
                .toHaveProperty('value', expectedIndex.entries[i].value);

        // Check the collection structure
        const id = await signing.id();
        expect(collection).toHaveProperty('senderIdentity', id);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('ownerIdentity', id);
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', await signing.publicKey());
        expect(entryBlockList).toHaveProperty('signature', await signing.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', values[i]);
            expect(entries[i]).toHaveProperty('clock', i + 1);
        }
    });

    it('removes redundant entries when the compact threshold is reached', async () => {
        // Create collection (to be overwritten when add publishes)
        let collection: ICollection = {
            senderIdentity: '',
            address: '',
            entryBlockLists: [],
            addCount: NaN
        };

        // Construct an updater with private write access and add an entry
        const signing = new MockSigningProvider('test-id');
        const content = new MockContentStorage();
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            c => { collection = c; }, { ...defaultCollectionOptions, compactThreshold: 4 });
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
        const id = await signing.id();
        expect(collection).toHaveProperty('senderIdentity', id);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', 0);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('ownerIdentity', id);
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', await signing.publicKey());
        expect(entryBlockList).toHaveProperty('signature', await signing.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length - 1);
        expect(entryBlock.entries[0]).toHaveProperty('value', values[0]);
        expect(entryBlock.entries[0]).toHaveProperty('clock', 1)
        expect(entryBlock.entries[1]).toHaveProperty('value', values[2]);
        expect(entryBlock.entries[1]).toHaveProperty('clock', 3)
        expect(entryBlock.entries[2]).toHaveProperty('value', values[3]);
        expect(entryBlock.entries[2]).toHaveProperty('clock', 4)
    });

    it('does not add entry when write access is not granted', async () => {
        // Create common content storage to share between updaters with different identities
        const content = new MockContentStorage();

        // Create common local storage to emulate sharing collections without pubsub
        const local = new MockLocalStorage();

        // Identity 'test-id-1' creates private store
        const updaterOther: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockSigningProvider('test-id-1'),
            local, _ => { }, { ...defaultCollectionOptions });
        await updaterOther.init('test');

        // Identity 'test-id-2' opens the store created by 'test-id-1' and adds an item
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, new MockSigningProvider('test-id-2'),
            local, _ => { }, { ...defaultCollectionOptions, address: updaterOther.address() });
        await updater.init('test');

        // ---
        await updater.add([{ _id: 'the-key' }]);
        // ---

        // Check the entry was not added
        expect(updater.numEntries()).toEqual(0);
    });

    //
    // --- merge ---
    //

    it('merges a valid collection into an empty store', async () => {
        const content = new MockContentStorage();
        const signing = new MockSigningProvider('test-id');
        const id = await signing.id();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');
        let updated = false;
        updater.onUpdated(() => { updated = true; });

        const entry: IEntry = {
            value: { _id: 'entry-0' },
            clock: 1
        };

        const collection: ICollection = {
            senderIdentity: id,
            address: updater.address(),
            entryBlockLists: [await make_entry_block_list([[entry]], content, signing)],
            addCount: 1
        };

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(1);
        expect(updater.index().has('entry-0')).toBeTruthy();
        expect(updated).toBeTruthy();
    });

    it('does not merge an invalid collection', async () => {
        const content = new MockContentStorage();
        const signing = new MockSigningProvider('test-id');
        const id = await signing.id();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = {
            value: { _id: 'entry-0' },
            clock: 1
        };

        const collection: ICollection = {
            senderIdentity: id,
            address: updater.address(),
            entryBlockLists: [await make_entry_block_list([[entry]], content, signing)]
        } as ICollection;

        // ---
        await updater.merge(collection);
        // ---

        expect(updater.numEntries()).toEqual(0);
    });

    it('does not merge an entry block list that is not new', async () => {
        const content = new MockContentStorage();
        const signing = new MockSigningProvider('test-id');
        const id = await signing.id();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry1: IEntry = {
            value: { _id: 'entry-0' },
            clock: 1
        };

        const collection1: ICollection = {
            senderIdentity: id,
            address: updater.address(),
            entryBlockLists: [await make_entry_block_list([[entry1]], content, signing)],
            addCount: 1
        };

        await updater.merge(collection1);

        const entry2: IEntry = {
            value: { _id: 'entry-1' },
            clock: 1
        };

        const collection2: ICollection = {
            senderIdentity: id,
            address: updater.address(),
            entryBlockLists: [await make_entry_block_list([[entry2]], content, signing)],
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
        const signing = new MockSigningProvider('test-id');
        const id = await signing.id();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = {
            value: { _id: 'entry-0' },
            clock: 1
        };

        const entryBlock: IEntryBlock = { entries: [entry] };

        const entryBlockList: IEntryBlockList = {
            ownerIdentity: id,
            entryBlockCids: [await content.putObject(entryBlock)],
            clock: 1,
            publicKey: await signing.publicKey(),
            signature: ''
        };

        const collection: ICollection = {
            senderIdentity: id,
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
        const signing = new MockSigningProvider('test-id');
        const id = await signing.id();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = {
            value: { _id: 'entry-0' },
            clock: 1
        };

        const entryBlock: IEntryBlock = { entries: [entry], rogueProperty: true } as IEntryBlock;

        const entryBlockList: IEntryBlockList = {
            ownerIdentity: id,
            entryBlockCids: [await content.putObject(entryBlock)],
            clock: 1,
            publicKey: await signing.publicKey(),
            signature: ''
        };
        entryBlockList.signature = await signing.sign(entryBlockList);

        const collection: ICollection = {
            senderIdentity: id,
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
        const signing = new MockSigningProvider('test-id');
        const id = await signing.id();

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            _ => { }, { ...defaultCollectionOptions });
        await updater.init('test');

        const entry: IEntry = {
            value: { _id: 'entry-0' },
            clock: 1
        };

        const entryBlock: IEntryBlock = { entries: [entry] } as IEntryBlock;

        const entryBlockList: IEntryBlockList = {
            ownerIdentity: id,
            entryBlockCids: [await wrongContent.putObject(entryBlock)],
            clock: 1,
            publicKey: await signing.publicKey(),
            signature: ''
        };
        entryBlockList.signature = await signing.sign(entryBlockList);

        const collection: ICollection = {
            senderIdentity: id,
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
        const signing = new MockSigningProvider('test-id');

        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            content, signing, new MockLocalStorage(),
            c => { collection = c }, { ...defaultCollectionOptions });
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
        const id = await signing.id();
        expect(collection).toHaveProperty('senderIdentity', id);
        expect(collection).toHaveProperty('address', updater.address());
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection).toHaveProperty('addCount', values.length);
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];
        expect(entryBlockList).toHaveProperty('ownerIdentity', id);
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', await signing.publicKey());
        expect(entryBlockList).toHaveProperty('signature', await signing.sign({ ...entryBlockList, signature: '' }));
        expect(entryBlockList.entryBlockCids).toHaveLength(1);
        const entryBlock = await content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();
        if (!entryBlock)
            return;
        expect(entryBlock).toHaveProperty('entries');
        expect(entryBlock.entries).toHaveLength(values.length);
        for (let i = 0; i < entryBlock.entries.length; ++i) {
            const entries = entryBlock.entries;
            expect(entries[i]).toHaveProperty('value', values[i]);
            expect(entries[i]).toHaveProperty('clock', i + 1);
        }
    })
});
