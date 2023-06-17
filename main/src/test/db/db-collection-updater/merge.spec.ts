import { AccessRights } from "../../../library/public-data/access-rights";
import { ICollection } from "../../../library/public-data/collection";
import { IEntry } from "../../../library/public-data/entry";
import { makeEntryBlockList } from "../../test_util/collection-utils";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater merge', () => {
    it('merges a valid collection into an empty collection', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const entry: IEntry = { _id: 'entry-0', _clock: 1 };

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([[entry]], env.content, env.cryptoOwn)],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check the entry was merged
        expect(env.updaterOwn.numEntries()).toEqual(1);
        expect(env.updaterOwn.index().has('entry-0')).toBeTruthy();

        // Check the update was notified
        expect(env.updatesOwn).toHaveLength(1);
        const updatedValues = env.updatesOwn[0];
        expect(updatedValues.length).toEqual(1);
        expect(updatedValues[0]).toEqual({ ...entry, _identity: { publicKey: env.publicKeyOwn } });

        // Check no collection was published
        expect(env.published).toHaveLength(0);
    });

    it('merges a valid collection into a non-empty collection', async () => {
        // Construct and init other and own updaters
        const env = new UpdaterTestEnv();
        env.createOther({ publicAccess: AccessRights.ReadWrite });
        await env.initOther();
        env.createOwn({ publicAccess: AccessRights.ReadWrite });
        await env.initOwn();

        // Merge own entry
        const entryOwn: IEntry = { _id: 'entry-own', _clock: 1 };
        const collectionOwn: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([[entryOwn]], env.content, env.cryptoOwn)],
            addCount: 1
        };
        await env.updaterOwn.merge(collectionOwn);

        // Merge other's entry
        const entryOther: IEntry = { _id: 'entry-other', _clock: 2 };
        const collectionOther: ICollection = {
            senderPublicKey: env.publicKeyOther,
            address: env.updaterOther.address(),
            entryBlockLists: [await makeEntryBlockList([[entryOther]], env.content, env.cryptoOther)],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collectionOther);
        // ---

        // Check updaters resolved to the same address
        expect(env.updaterOwn.address()).toEqual(env.updaterOther.address());

        // Check entries from both peers were merged
        expect(env.updaterOwn.numEntries()).toEqual(2);
        expect(env.updaterOwn.index().has('entry-own')).toBeTruthy();
        expect(env.updaterOwn.index().has('entry-other')).toBeTruthy();

        // Check last notified update contains both entries
        expect(env.updatesOwn).toHaveLength(2);
        const updatedValues = env.updatesOwn[1];
        expect(updatedValues.length).toEqual(2);
        expect(updatedValues[0]).toEqual({ ...entryOwn, _identity: { publicKey: env.publicKeyOwn } });
        expect(updatedValues[1]).toEqual({ ...entryOther, _identity: { publicKey: env.publicKeyOther } });
    });

    it('merges entries with same clock in public key order', async () => {
        // Construct and init other and own updaters
        const env = new UpdaterTestEnv();
        env.createOther({ publicAccess: AccessRights.ReadWrite });
        await env.initOther();
        env.createOwn({ publicAccess: AccessRights.ReadWrite });
        await env.initOwn();

        const key = 'entry';
        const valueOwn = 'a';
        const entryOwn: IEntry = { _id: key, _clock: 1, value: valueOwn } as IEntry;

        const valueOther = 'b';
        const entryOther: IEntry = { _id: key, _clock: 1, value: valueOther } as IEntry;

        // Merge collection with entry block list for own and other
        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [
                await makeEntryBlockList([[entryOther]], env.content, env.cryptoOther),
                await makeEntryBlockList([[entryOwn]], env.content, env.cryptoOwn)
            ],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check both entries were merged
        expect(env.updaterOwn.numEntries()).toEqual(2);

        // Check entries with same clock were merged in public key order
        expect(env.updaterOwn.index().has(key)).toBeTruthy();
        expect(env.updaterOwn.index().get(key)).toHaveProperty('value', env.publicKeyOwn > env.publicKeyOther ? valueOwn : valueOther);

        // Check the update was notified
        expect(env.updatesOwn).toHaveLength(1);
    });

    it('merges entries with different clocks in clock order', async () => {
        // Construct and init other and own updaters
        const env = new UpdaterTestEnv();
        env.createOther({ publicAccess: AccessRights.ReadWrite });
        await env.initOther();
        env.createOwn({ publicAccess: AccessRights.ReadWrite });
        await env.initOwn();

        const keyX = 'x';
        const keyY = 'y';

        const valueA = 'a';
        const valueB = 'b';

        // Sequence of entries that overwrite values for both keys when applied in clock order
        const entryA1: IEntry = { _id: keyX, _clock: 1, value: valueA } as IEntry; // A: x = a
        const entryB1: IEntry = { _id: keyX, _clock: 2, value: valueB } as IEntry; // B: x = b
        const entryB2: IEntry = { _id: keyY, _clock: 3, value: valueB } as IEntry; // B: y = b
        const entryA2: IEntry = { _id: keyY, _clock: 4, value: valueA } as IEntry; // A: y = a

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [
                await makeEntryBlockList([[entryA1, entryA2]], env.content, env.cryptoOwn),
                await makeEntryBlockList([[entryB1, entryB2]], env.content, env.cryptoOther)
            ],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check all four entries were added
        expect(env.updaterOwn.numEntries()).toEqual(4);

        // Check entries were applied in clock order
        expect(env.updaterOwn.index().has(keyX)).toBeTruthy();
        expect(env.updaterOwn.index().get(keyX)).toHaveProperty('value', valueB);
        expect(env.updaterOwn.index().has(keyY)).toBeTruthy();
        expect(env.updaterOwn.index().get(keyY)).toHaveProperty('value', valueA);

        // Check update was notified
        expect(env.updatesOwn).toHaveLength(1);
    });

    it('merges a valid collection requiring proof of work into an empty collection', async () => {
        // Construct and init updater with complexity
        const env = new UpdaterTestEnv();
        const complexity = 4;
        env.createOwn({ complexity });
        await env.initOwn();

        const entry: IEntry = { _id: 'entry-0', _clock: 1 };
        const [signature, nonce] = await env.cryptoOwn.sign_complex(entry, env.updaterOwn.address(), complexity);
        entry._proof = { signature, nonce };

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([[entry]], env.content, env.cryptoOwn)],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check collection was merged (entries are included)
        expect(env.updaterOwn.numEntries()).toEqual(1);
        expect(env.updaterOwn.index().has('entry-0')).toBeTruthy();

        // Check update was notified
        expect(env.updatesOwn).toHaveLength(1);
    });

    it('sets the last value for a key when merging with last write wins', async () => {
        // Construct and init updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.initOwn();

        const key = 'entry-0';
        const entries: IEntry[] = [
            { _id: key, _clock: 1, val: 1 } as IEntry,
            { _id: key, _clock: 2, val: 2 } as IEntry];

        const collection: ICollection = {
            senderPublicKey: env.publicKeyOwn,
            address: env.updaterOwn.address(),
            entryBlockLists: [await makeEntryBlockList([entries], env.content, env.cryptoOwn)],
            addCount: 1
        };

        // ---
        await env.updaterOwn.merge(collection);
        // ---

        // Check both entries were merged
        expect(env.updaterOwn.numEntries()).toEqual(2);

        // Check the last entry is set for the key
        expect(env.updaterOwn.index().has(key)).toBeTruthy();
        expect(env.updaterOwn.index().get(key)).toEqual({ ...entries[1], _identity: { publicKey: env.publicKeyOwn } });

        // Check the update was notified
        expect(env.updatesOwn).toHaveLength(1);
    });
});