import { IEntryBlock } from "../../../library/public-data/entry-block";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater on peer joined', () => {
    it('publishes a collection when a peer joins', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const values = [
            { _id: 'key-1', value: 1 },
            { _id: 'key-2', value: 2 },
            { _id: 'key-3', value: 3 }];
        await env.updaterOwn.add(values);

        // ---
        env.updaterOwn.onPeerJoined('peer-42');
        // ---

        // Generate expected entries containing value and incrementing clock
        const expectedEntries = values.map((v, i) => ({ ...v, _clock: i + 1 }));

        // Check a collection was published to peers (in addition to the one
        // published after calling add)
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
            expect(entryBlock.entries).toEqual(expectedEntries);
        }
    });
});