import { IEntryBlock } from "../../../library/public-data/entry-block";
import { entryByClock } from "../../../library/util/sort-comparators";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater add compact', () => {
    it('removes redundant entries when the compact threshold is reached', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ compactThreshold: 4 });
        await env.initOwn();

        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 },
            { _id: 'key-2', value: 4 }];

        // Add all but the last
        await env.updaterOwn.add(values.slice(0, -1));

        // ---
        await env.updaterOwn.add(values.slice(-1));
        // ---

        // Check each value with a unique key was added as an entry
        expect(env.updaterOwn.numEntries()).toEqual(values.length - 1);

        // Generate expected entries
        // Use an id-keyed map to retain only the last entry for a given id
        const expectedIndex: Map<string, any> = new Map();
        values.forEach((v, i) => { expectedIndex.set(v._id, { ...v, _clock: ++i }); });
        const expectedEntries = [...expectedIndex.values()].sort(entryByClock);

        // Check update was notified with expected entries augmented with identity
        expect(env.updatesOwn).toHaveLength(2);
        const updateOwn = env.updatesOwn[1];
        expect(updateOwn).toEqual(expectedEntries.map(e => ({ ...e, _identity: { publicKey: env.publicKeyOwn } })));

        // Check a collection was published to peers
        expect(env.published).toHaveLength(2);
        const collection = env.published[1];

        // Check collection properties
        expect(collection).toHaveProperty('senderPublicKey', env.publicKeyOwn);
        expect(collection).toHaveProperty('address', env.updaterOwn.address());

        // Note: addCount is reset after a compaction occurs
        expect(collection).toHaveProperty('addCount', 0);

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
