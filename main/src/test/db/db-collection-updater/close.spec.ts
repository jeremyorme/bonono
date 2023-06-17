import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater close', () => {
    it('closes', async () => {
        // Construct and init updater
        const env = new UpdaterTestEnv();
        env.createOwn();
        await env.updaterOwn.init('test');

        // ---
        env.updaterOwn.close();
        // ---

        // Check the close address matches the db updater address
        expect(env.closed).toHaveLength(1);
        expect(env.closed[0]).toEqual(env.updaterOwn.address());
    });
});