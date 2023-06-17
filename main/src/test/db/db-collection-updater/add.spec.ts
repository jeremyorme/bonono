import { AccessRights } from "../../../library/public-data/access-rights";
import { ConflictResolution } from "../../../library/public-data/conflict-resolution";
import { IEntryBlock } from "../../../library/public-data/entry-block";
import { entryByClock } from "../../../library/util/sort-comparators";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater add', () => {
    it('adds entries when write access is granted', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await env.updaterOwn.add(values);
        // ---

        // Check each value was added as an entry
        expect(env.updaterOwn.numEntries()).toEqual(values.length);

        // Generate expected entries containing value and incrementing clock
        const expectedEntries = values.map((v, i) => ({ ...v, _clock: i + 1 }));

        // Check update was notified with expected entries augmented with identity
        expect(env.updatesOwn).toHaveLength(1);
        const updateOwn = env.updatesOwn[0];
        expect(updateOwn).toEqual(expectedEntries.map(e => ({ ...e, _identity: { publicKey: env.publicKeyOwn } })));

        // Check a collection was published to peers
        expect(env.published).toHaveLength(1);
        const collection = env.published[0];

        // Check collection properties
        expect(collection).toHaveProperty('senderPublicKey', env.publicKeyOwn);
        expect(collection).toHaveProperty('address', env.updaterOwn.address());
        expect(collection).toHaveProperty('addCount', values.length);

        // Check the collection contains a single entry block list
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];

        // Check the entry block list properties
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', env.publicKeyOwn);
        const expectedSig = await env.cryptoOwn.sign({ ...entryBlockList, signature: '' });
        expect(entryBlockList).toHaveProperty('signature', expectedSig);

        // Check the entry block list contains a single entry block CID and fetch the entry block
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList.entryBlockCids).toHaveLength(1);

        // Try to fetch the entry block and check it exists
        const entryBlock = await env.content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();

        if (entryBlock) {
            // Check the entry block contains the expected entries
            expect(entryBlock).toHaveProperty('entries');
            expect(entryBlock.entries).toEqual(expectedEntries);
        }
    });

    it('adds entries with required proof of work', async () => {
        // Construct and init an updater with complexity
        const complexity = 4;
        const env = new UpdaterTestEnv();
        env.createOwn({ complexity });
        await env.initOwn();

        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await env.updaterOwn.add(values);
        // ---

        // Check each value was added as an entry
        expect(env.updaterOwn.numEntries()).toEqual(values.length);

        // Generate expected entries containing value and incrementing clock
        const expectedEntries = values.map((v, i) => ({ ...v, _clock: i + 1 }));

        // Helper to check entry has valid properties and proof
        const checkEntry = (e, i) => {
            expect(e).toBeTruthy();
            expect(e).toHaveProperty('value', expectedEntries[i].value);
            expect(e).toHaveProperty('_id', expectedEntries[i]._id);
            expect(e).toHaveProperty('_clock', expectedEntries[i]._clock);
            expect(e).toHaveProperty('_proof');
            if (e._proof) {
                const entryNoProof = { ...e };
                delete entryNoProof._proof;
                expect(env.cryptoOwn.verify_complex(
                    entryNoProof,
                    e._proof.signature,
                    env.publicKeyOwn,
                    env.updaterOwn.address(),
                    e._proof.nonce,
                    complexity)).toBeTruthy();
            }
        };

        // Check update was notified with expected entries augmented with identity
        expect(env.updatesOwn).toHaveLength(1);
        const updateOwn = env.updatesOwn[0];
        updateOwn.forEach(checkEntry);
        updateOwn.forEach(e => { expect(e).toHaveProperty('_identity', { publicKey: env.publicKeyOwn }) });

        // Check a collection was published to peers
        expect(env.published).toHaveLength(1);
        const collection = env.published[0];

        // Check collection properties
        expect(collection).toHaveProperty('senderPublicKey', env.publicKeyOwn);
        expect(collection).toHaveProperty('address', env.updaterOwn.address());
        expect(collection).toHaveProperty('addCount', values.length);

        // Check the collection contains a single entry block list
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];

        // Check the entry block list properties
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', env.publicKeyOwn);
        const expectedSig = await env.cryptoOwn.sign({ ...entryBlockList, signature: '' });
        expect(entryBlockList).toHaveProperty('signature', expectedSig);

        // Check the entry block list contains a single entry block CID and fetch the entry block
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList.entryBlockCids).toHaveLength(1);

        // Try to fetch the entry block and check it exists
        const entryBlock = await env.content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();

        if (entryBlock) {
            // Check the entry block contains the expected entries
            expect(entryBlock).toHaveProperty('entries');
            expect(entryBlock.entries).toHaveLength(values.length);
            entryBlock.entries.forEach(checkEntry);
        }
    });

    it('adds entries when encryption is enabled', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ publicAccess: AccessRights.None });
        await env.initOwn();

        // The first value contains _clock and _identity as if it had come from a query
        // We want to check that these get stripped off prior to encryption.
        const values = [
            { _id: 'key-1', _clock: 1, _identity: { publicKey: env.publicKeyOwn }, value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];

        // ---
        await env.updaterOwn.add(values);
        // ---

        // Check each value was added as an entry
        expect(env.updaterOwn.numEntries()).toEqual(values.length);

        // Generate expected entries containing value and incrementing clock
        const expectedEntries = values.map((v, i) => ({ ...v, _clock: i + 1 }));

        // Check update was notified with expected entries augmented with identity
        expect(env.updatesOwn).toHaveLength(1);
        const updateOwn = env.updatesOwn[0];
        expect(updateOwn).toEqual(expectedEntries.map(e => ({ ...e, _identity: { publicKey: env.publicKeyOwn } })));

        // Check a collection was published to peers
        expect(env.published).toHaveLength(1);
        const collection = env.published[0];

        // Check collection properties
        expect(collection).toHaveProperty('senderPublicKey', env.publicKeyOwn);
        expect(collection).toHaveProperty('address', env.updaterOwn.address());
        expect(collection).toHaveProperty('addCount', values.length);

        // Check the collection contains a single entry block list
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];

        // Check the entry block list properties
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', env.publicKeyOwn);
        const expectedSig = await env.cryptoOwn.sign({ ...entryBlockList, signature: '' });
        expect(entryBlockList).toHaveProperty('signature', expectedSig);

        // Check the entry block list contains a single entry block CID and fetch the entry block
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList.entryBlockCids).toHaveLength(1);

        // Try to fetch the entry block and check it exists
        const entryBlock = await env.content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();

        if (entryBlock) {
            // Check the entry block contains the expected entries
            expect(entryBlock).toHaveProperty('entries');
            expect(entryBlock.entries).toHaveLength(values.length);
            await Promise.all(entryBlock.entries.map(async (e, i) => {
                expect(e).toHaveProperty('_id', await env.cryptoOwn.encrypt(values[i]._id));
                expect(e).toHaveProperty('_clock', i + 1);
                expect(e).toHaveProperty('payload', await env.cryptoOwn.encrypt(JSON.stringify({ value: values[i].value })));
            }));
        }
    });

    it('overwrites value in index when adding subsequent entry with existing key using last write wins', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ conflictResolution: ConflictResolution.LastWriteWins });
        await env.initOwn();

        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 },
            { _id: 'key-2', value: 4 }];

        // Add all but the last entry
        await env.updaterOwn.add(values.slice(0, -1));

        // ---
        await env.updaterOwn.add(values.slice(-1));
        // ---

        // Check each value was added as an entry
        expect(env.updaterOwn.numEntries()).toEqual(values.length);

        // Generate expected index entries
        // Use an id-keyed map to retain only the last entry for a given id
        const expectedIndex: Map<string, any> = new Map();
        values.forEach((v, i) => { expectedIndex.set(v._id, { ...v, _clock: ++i }); });
        const expectedIndexEntries = [...expectedIndex.values()].sort(entryByClock);

        // Check two updates were notified and last update has expected entries augmented with identity
        expect(env.updatesOwn).toHaveLength(2);
        expect(env.updatesOwn[1]).toEqual(expectedIndexEntries.map(e => ({ ...e, _identity: { publicKey: env.publicKeyOwn } })));

        // Check two collections were published to peers
        expect(env.published).toHaveLength(2);
        const collection = env.published[1];

        // Check collection properties
        expect(collection).toHaveProperty('senderPublicKey', env.publicKeyOwn);
        expect(collection).toHaveProperty('address', env.updaterOwn.address());
        expect(collection).toHaveProperty('addCount', values.length);

        // Check the collection contains a single entry block list
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];

        // Check the entry block list properties
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', env.publicKeyOwn);
        const expectedSig = await env.cryptoOwn.sign({ ...entryBlockList, signature: '' });
        expect(entryBlockList).toHaveProperty('signature', expectedSig);

        // Check the entry block list contains a single entry block CID and fetch the entry block
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList.entryBlockCids).toHaveLength(1);

        // Try to fetch the entry block and check it exists
        const entryBlock = await env.content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();

        if (entryBlock) {
            // Check the entry block contains the expected entries
            expect(entryBlock).toHaveProperty('entries');
            const expectedEntries = values.map((v, i) => ({ ...v, _clock: i + 1 }));
            expect(entryBlock.entries).toEqual(expectedEntries);
        }
    });

    it('does not overwrite value in index when adding subsequent entry with existing key using first write wins', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ conflictResolution: ConflictResolution.FirstWriteWins });
        await env.initOwn();

        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 },
            { _id: 'key-2', value: 4 }];

        // Add all but the last entry
        await env.updaterOwn.add(values.slice(0, -1));

        // ---
        await env.updaterOwn.add(values.slice(-1));
        // ---

        // Check each value was added as an entry
        expect(env.updaterOwn.numEntries()).toEqual(values.length);

        // Generate expected index entries
        // Use an id-keyed map to retain only the first entry for a given id
        // Values are added to the map in reverse order to ensure first write wins
        const expectedIndex: Map<string, any> = new Map();
        [...values].reverse().forEach((v, i) => { expectedIndex.set(v._id, { ...v, _clock: values.length - i++ }); });
        const expectedIndexEntries = [...expectedIndex.values()].sort(entryByClock);

        // Check two updates were notified and last update has expected entries augmented with identity
        expect(env.updatesOwn).toHaveLength(2);
        expect(env.updatesOwn[1]).toEqual(expectedIndexEntries.map(e => ({ ...e, _identity: { publicKey: env.publicKeyOwn } })));

        // Check two collections were published to peers
        expect(env.published).toHaveLength(2);
        const collection = env.published[1];

        // Check collection properties
        expect(collection).toHaveProperty('senderPublicKey', env.publicKeyOwn);
        expect(collection).toHaveProperty('address', env.updaterOwn.address());
        expect(collection).toHaveProperty('addCount', values.length);

        // Check the collection contains a single entry block list
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];

        // Check the entry block list properties
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', env.publicKeyOwn);
        const expectedSig = await env.cryptoOwn.sign({ ...entryBlockList, signature: '' });
        expect(entryBlockList).toHaveProperty('signature', expectedSig);

        // Check the entry block list contains a single entry block CID and fetch the entry block
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList.entryBlockCids).toHaveLength(1);

        // Try to fetch the entry block and check it exists
        const entryBlock = await env.content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();

        if (entryBlock) {
            // Check the entry block contains the expected entries
            expect(entryBlock).toHaveProperty('entries');
            const expectedEntries = values.map((v, i) => ({ ...v, _clock: i + 1 }));
            expect(entryBlock.entries).toEqual(expectedEntries);
        }
    });

    it('does add entry to read-any-write-own store when _id matches self identity', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ publicAccess: AccessRights.ReadAnyWriteOwn });
        await env.initOwn();

        const values = [
            { _id: env.publicKeyOwn, value: 'my-data' }
        ];

        // ---
        await env.updaterOwn.add(values);
        // ---

        // Check each value was added as an entry
        expect(env.updaterOwn.numEntries()).toEqual(values.length);

        // Generate expected entries containing value and incrementing clock
        const expectedEntries = values.map((v, i) => ({ ...v, _clock: i + 1 }));

        // Check update was notified with expected entries augmented with identity
        expect(env.updatesOwn).toHaveLength(1);
        const updateOwn = env.updatesOwn[0];
        expect(updateOwn).toEqual(expectedEntries.map(e => ({ ...e, _identity: { publicKey: env.publicKeyOwn } })));

        // Check a collection was published to peers
        expect(env.published).toHaveLength(1);
        const collection = env.published[0];

        // Check collection properties
        expect(collection).toHaveProperty('senderPublicKey', env.publicKeyOwn);
        expect(collection).toHaveProperty('address', env.updaterOwn.address());
        expect(collection).toHaveProperty('addCount', values.length);

        // Check the collection contains a single entry block list
        expect(collection).toHaveProperty('entryBlockLists');
        expect(collection.entryBlockLists).toHaveLength(1);
        const entryBlockList = collection.entryBlockLists[0];

        // Check the entry block list properties
        expect(entryBlockList).toHaveProperty('clock', values.length);
        expect(entryBlockList).toHaveProperty('publicKey', env.publicKeyOwn);
        const expectedSig = await env.cryptoOwn.sign({ ...entryBlockList, signature: '' });
        expect(entryBlockList).toHaveProperty('signature', expectedSig);

        // Check the entry block list contains a single entry block CID and fetch the entry block
        expect(entryBlockList).toHaveProperty('entryBlockCids');
        expect(entryBlockList.entryBlockCids).toHaveLength(1);

        // Try to fetch the entry block and check it exists
        const entryBlock = await env.content.getObject<IEntryBlock>(entryBlockList.entryBlockCids[0]);
        expect(entryBlock).toBeTruthy();

        if (entryBlock) {
            // Check the entry block contains the expected entries
            expect(entryBlock).toHaveProperty('entries');
            expect(entryBlock.entries).toEqual(expectedEntries);
        }
    });
});