import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater init exceptional', () => {
    it('fails to init non-existent collection', async () => {
        // Construct updater with non existent address
        const env = new UpdaterTestEnv();
        env.createOwn({ address: 'non-existent' });

        // ---
        const success = await env.updaterOwn.init('test');
        // ---

        // Check the updater failed to init
        expect(success).toBeFalsy();

        // Check the address was not set
        expect(env.updaterOwn.address()).toBeFalsy();
    });
});