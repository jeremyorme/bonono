import { defaultCollectionOptions } from "../../../library/private-data/collection-options";
import { AccessRights } from "../../../library/public-data/access-rights";
import { ICollectionManifest } from "../../../library/public-data/collection-manifest";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater init new', () => {
    it('inits new public-writeable collection', async () => {
        // Construct an updater with public write access
        const env = new UpdaterTestEnv();
        env.createOwn({ publicAccess: AccessRights.ReadWrite });

        // ---
        await env.updaterOwn.init('test');
        // ---

        // Manifest address is valid
        expect(env.updaterOwn.address()).toBeTruthy();
        const manifest = await env.content.getObject<ICollectionManifest>(env.updaterOwn.address());
        expect(manifest).toBeTruthy();

        // Collection name is set correctly
        expect(manifest).toHaveProperty('name', 'test');

        // Creator public key is empty (public write collection has no owner)
        expect(manifest).toHaveProperty('creatorPublicKey', '');

        // Public access is set to ReadWrite, as requested
        expect(manifest).toHaveProperty('publicAccess', 'ReadWrite');

        // Conflict resolution is set to the default value
        expect(manifest).toHaveProperty('conflictResolution', defaultCollectionOptions.conflictResolution);

        // Entry block size is set to the default value
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Complexity is set to the default value
        expect(manifest).toHaveProperty('complexity', defaultCollectionOptions.complexity);

        // Check we have write access
        expect(env.updaterOwn.canWrite()).toEqual(true);
    });

    it('inits new public-writeable (own-key) collection', async () => {
        // Construct an updater with public read-any-write-own access
        const env = new UpdaterTestEnv();
        env.createOwn({ publicAccess: AccessRights.ReadAnyWriteOwn });

        // ---
        await env.updaterOwn.init('test');
        // ---

        // Manifest address is valid
        expect(env.updaterOwn.address()).toBeTruthy();
        const manifest = await env.content.getObject<ICollectionManifest>(env.updaterOwn.address());
        expect(manifest).toBeTruthy();

        // Collection name is set correctly
        expect(manifest).toHaveProperty('name', 'test');

        // Creator public key is empty (public write collection has no owner)
        expect(manifest).toHaveProperty('creatorPublicKey', '');

        // Public access is set to ReadAnyWriteOwn, as requested
        expect(manifest).toHaveProperty('publicAccess', 'ReadAnyWriteOwn');

        // Conflict resolution is set to the default value
        expect(manifest).toHaveProperty('conflictResolution', defaultCollectionOptions.conflictResolution);

        // Entry block size is set to the default value
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Complexity is set to the default value
        expect(manifest).toHaveProperty('complexity', defaultCollectionOptions.complexity);

        // Check we have write access
        expect(env.updaterOwn.canWrite()).toEqual(true);
    });

    it('inits new public read-only collection', async () => {
        // Construct an updater with public read-only access
        const env = new UpdaterTestEnv();
        env.createOwn({ publicAccess: AccessRights.Read });

        // ---
        await env.updaterOwn.init('test');
        // ---

        // Manifest address is valid
        expect(env.updaterOwn.address()).toBeTruthy();
        const manifest = await env.content.getObject<ICollectionManifest>(env.updaterOwn.address());
        expect(manifest).toBeTruthy();

        // Collection name is set correctly
        expect(manifest).toHaveProperty('name', 'test');

        // Creator public key is set to our own public key
        expect(manifest).toHaveProperty('creatorPublicKey', await env.cryptoOwn.publicKey());

        // Public access is set to Read, as requested
        expect(manifest).toHaveProperty('publicAccess', 'Read');

        // Conflict resolution is set to the default value
        expect(manifest).toHaveProperty('conflictResolution', defaultCollectionOptions.conflictResolution);

        // Entry block size is set to the default value
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Complexity is set to the default value
        expect(manifest).toHaveProperty('complexity', defaultCollectionOptions.complexity);

        // Check we have write access
        expect(env.updaterOwn.canWrite()).toEqual(true);
    });
});