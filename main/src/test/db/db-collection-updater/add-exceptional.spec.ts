import { AccessRights } from "../../../library/public-data/access-rights";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater add exceptional', () => {
    it('does not add entry when write access is not granted', async () => {
        // Create a public read-only collection owned by other and
        // then open it with own updater.
        const env = new UpdaterTestEnv();
        env.createOther();
        await env.initOther();
        env.createOwn({ address: env.updaterOther.address() });
        await env.initOwn();

        // ---
        await env.updaterOwn.add([{ _id: 'the-key' }]);
        // ---

        // Check the entry was not added
        expect(env.updaterOwn.numEntries()).toEqual(0);
    });

    it('does not add entry to read-any-write-own store when _id does not match self identity', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ publicAccess: AccessRights.ReadAnyWriteOwn });
        await env.initOwn();

        // ---
        await env.updaterOwn.add([{ _id: 'the-key' }]);
        // ---

        // Check the entry was not added
        expect(env.updaterOwn.numEntries()).toEqual(0);
    });

    it('does not add entries to index when the current clock has reached max clock', async () => {
        // Construct and init an updater
        const env = new UpdaterTestEnv();
        env.createOwn({ upperClock: 0 });
        await env.initOwn();

        // ---
        await env.updaterOwn.add([{ _id: 'the-key' }]);
        // ---

        // Check entry was added
        expect(env.updaterOwn.numEntries()).toEqual(1);

        // But doesn't appear in the index
        expect(env.updatesOwn).toHaveLength(1);
        const update = env.updatesOwn[0];
        expect(update).toHaveLength(0);
    });
});