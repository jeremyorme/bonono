import { ICollection } from "../../../library/public-data/collection";
import { IEntry } from "../../../library/public-data/entry";
import { IEntryBlock } from "../../../library/public-data/entry-block";
import { IEntryBlockList } from "../../../library/public-data/entry-block-list";
import { makeEntryBlockList } from "../../test_util/collection-utils";
import { MockContentStorage } from "../../test_util/mock-content-storage";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater merge exceptional', () => {
    it('does not merge an invalid collection', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const entry: IEntry = { _id: 'entry-0', _clock: 1 };

        // Collection is missing addCount property
        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([[entry]], env.content, env.cryptoOwn)]
        } as ICollection;

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check the collection was not merged
        expect(env.updaterOwn.numEntries()).toEqual(0);

        // Check an error was emitted
        expect(env.logSink.errors).toHaveLength(1);
        expect(env.logSink.errors[0]).toEqual(`Collection structure invalid (address = ${env.updaterOwn.address()})`);
    });

    it('does not merge an entry block list that is not new', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const entry1: IEntry = { _id: 'entry-0', _clock: 1 };

        const collection1: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([[entry1]], env.content, env.cryptoOwn)],
            addCount: 1
        };

        await env.updaterOwn.merge(collection1);

        const entry2: IEntry = { _id: 'entry-1', _clock: 1 };

        const collection2: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([[entry2]], env.content, env.cryptoOwn)],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection2);
        // ---

        // Check only the first collection was merged
        expect(env.updaterOwn.numEntries()).toEqual(1);
        expect(env.updaterOwn.index().has('entry-0')).toBeTruthy();
        expect(!env.updaterOwn.index().has('entry-1')).toBeTruthy();
    });

    it('does not merge a collection with an invalid entry block list', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const entry: IEntry = { _id: 'entry-0', _clock: 1 };

        const entryBlock: IEntryBlock = { entries: [entry] };

        // Entry block list does not have a valid signature
        const entryBlockList: IEntryBlockList = {
            entryBlockCids: [await env.content.putObject(entryBlock)],
            clock: 1,
            publicKey: env.publicKeyOwn,
            signature: ''
        };

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [entryBlockList],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check the collection was not merged
        expect(env.updaterOwn.numEntries()).toEqual(0);

        // Check an warning was emitted
        expect(env.logSink.warnings).toHaveLength(1);
        expect(env.logSink.warnings[0]).toEqual(`Update without valid signature was ignored (address = ${env.updaterOwn.address()})`);
    });

    it('does not merge a collection with an invalid entry block', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const entry: IEntry = { _id: 'entry-0', _clock: 1 };

        // Entry block has a property that isn't allowed by the schema
        const entryBlock: IEntryBlock = { entries: [entry], rogueProperty: true } as IEntryBlock;

        const entryBlockList: IEntryBlockList = {
            entryBlockCids: [await env.content.putObject(entryBlock)],
            clock: 1,
            publicKey: env.publicKeyOwn,
            signature: ''
        };
        entryBlockList.signature = await env.cryptoOwn.sign(entryBlockList);

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [entryBlockList],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check the collection was not merged
        expect(env.updaterOwn.numEntries()).toEqual(0);

        // Check an warning was emitted
        expect(env.logSink.warnings).toHaveLength(1);
        expect(env.logSink.warnings[0]).toEqual(`Update containing invalid block was ignored (address = ${env.updaterOwn.address()})`);
    });

    it('does not merge a collection with an unfetchable entry block', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const entry: IEntry = { _id: 'entry-0', _clock: 1 };

        const entryBlock: IEntryBlock = { entries: [entry] } as IEntryBlock;

        // Create a different content provider to lose a block in
        const wrongContent = new MockContentStorage();

        // Entry block stored using a different content storage service
        const entryBlockList: IEntryBlockList = {
            entryBlockCids: [await wrongContent.putObject(entryBlock)],
            clock: 1,
            publicKey: env.publicKeyOwn,
            signature: ''
        };
        entryBlockList.signature = await env.cryptoOwn.sign(entryBlockList);

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [entryBlockList],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check the collection was not merged
        expect(env.updaterOwn.numEntries()).toEqual(0);

        // Check an warning was emitted
        expect(env.logSink.warnings).toHaveLength(1);
        expect(env.logSink.warnings[0]).toEqual(`Update referencing missing block was ignored (address = ${env.updaterOwn.address()})`);
    });

    it('does not index merged entries with clock values that are out of range', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ lowerClock: 2, upperClock: 4 });
        await env.initOwn();

        const entries: IEntry[] = [
            { _id: 'entry-1', _clock: 1 },
            { _id: 'entry-2', _clock: 2 },
            { _id: 'entry-3', _clock: 3 },
            { _id: 'entry-4', _clock: 4 }
        ];

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([entries], env.content, env.cryptoOwn)],
            addCount: 4
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check all entries were added
        expect(env.updaterOwn.numEntries()).toEqual(4);

        // Check the index only contains the entries within the specified clock range
        expect(env.updaterOwn.index().has('entry-1')).toBeFalsy();
        expect(env.updaterOwn.index().has('entry-2')).toBeTruthy();
        expect(env.updaterOwn.index().has('entry-3')).toBeTruthy();
        expect(env.updaterOwn.index().has('entry-4')).toBeFalsy();

        // Check the update was notified and contains only the entries within
        // the specified clock range
        expect(env.updatesOwn).toHaveLength(1);
        expect(env.updatesOwn[0].length).toEqual(2);
    });
});