import { defaultCollectionOptions } from "../../../library/private-data/collection-options";
import { AccessRights } from "../../../library/public-data/access-rights";
import { ICollectionManifest } from "../../../library/public-data/collection-manifest";
import { UpdaterTestEnv } from "../../test_util/updater-test-env";

describe('db-collection-updater init existing', () => {
    it('inits existing empty public-writeable collection', async () => {
        // Construct other's updater with public write access
        const env = new UpdaterTestEnv();
        env.createOther({ publicAccess: AccessRights.ReadWrite });

        // Init the other updater (creates the collection) before our own (opens the collection)
        await env.initOther();

        // Add an entry to make the collection non-empty
        await env.updaterOther.add([{ _id: 'the-key' }]);

        // Can open other's collection by providing same options (without needing its address).
        env.createOwn({ publicAccess: AccessRights.ReadWrite });

        // ---
        await env.updaterOwn.init(env.name);
        // ---

        // Both the other and own updater have resolved to the same collection address
        expect(env.updaterOwn.address()).toEqual(env.updaterOther.address());

        // Manifest address is valid
        expect(env.updaterOwn.address()).toBeTruthy();
        const manifest = await env.content.getObject<ICollectionManifest>(env.updaterOwn.address());
        expect(manifest).toBeTruthy();

        // Collection name is set correctly
        expect(manifest).toHaveProperty('name', env.name);

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

        // Check we have write access even though we didn't create the collection
        expect(env.updaterOwn.canWrite()).toEqual(true);

        // Check that own updater sees the entry created by other's updater
        expect(env.updaterOwn.numEntries()).toEqual(1);
    });

    it('inits existing empty publicly-writeable (own key only) collection', async () => {
        // Construct other's updater with public write (own key only) access
        const env = new UpdaterTestEnv();
        env.createOther({ publicAccess: AccessRights.ReadAnyWriteOwn });

        // Init the other updater (creates the collection) before our own (opens the collection)
        await env.initOther();

        // Add an entry to make the collection non-empty
        await env.updaterOther.add([{ _id: env.publicKeyOther }]);

        // Can open other's collection by providing same options (without needing its address).
        env.createOwn({ publicAccess: AccessRights.ReadAnyWriteOwn });

        // ---
        await env.updaterOwn.init(env.name);
        // ---

        // Both the other and own updater have resolved to the same collection address
        expect(env.updaterOwn.address()).toEqual(env.updaterOther.address());

        // Manifest address is valid
        expect(env.updaterOwn.address()).toBeTruthy();
        const manifest = await env.content.getObject<ICollectionManifest>(env.updaterOwn.address());
        expect(manifest).toBeTruthy();

        // Collection name is set correctly
        expect(manifest).toHaveProperty('name', env.name);

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

        // Check we have write access even though we didn't create the collection
        expect(env.updaterOwn.canWrite()).toEqual(true);

        // Check that own updater sees the entry created by other's updater
        expect(env.updaterOwn.numEntries()).toEqual(1);
    });

    it('inits existing empty public-read-only collection from creator public key', async () => {
        // Construct other's updater with public read-only access
        const env = new UpdaterTestEnv();
        env.createOther({ publicAccess: AccessRights.Read });

        // Init the other updater (creates the collection) before our own (opens the collection)
        await env.initOther();

        // Add an entry to make the collection non-empty
        await env.updaterOther.add([{ _id: 'the-key' }]);

        // Construct own updater with public read-only access, providing creator public key
        env.createOwn({ publicAccess: AccessRights.Read, creatorPublicKey: env.publicKeyOther });

        // ---
        await env.updaterOwn.init(env.name);
        // ---

        // Both the other and own updater have resolved to the same collection address
        expect(env.updaterOwn.address()).toEqual(env.updaterOther.address());

        // Manifest address is valid
        expect(env.updaterOwn.address()).toBeTruthy();
        const manifest = await env.content.getObject<ICollectionManifest>(env.updaterOwn.address());
        expect(manifest).toBeTruthy();

        // Collection name is set correctly
        expect(manifest).toHaveProperty('name', env.name);

        // Creator public key is set to other's public key
        expect(manifest).toHaveProperty('creatorPublicKey', env.publicKeyOther);

        // Public access is set to Read, as requested
        expect(manifest).toHaveProperty('publicAccess', 'Read');

        // Conflict resolution is set to the default value
        expect(manifest).toHaveProperty('conflictResolution', defaultCollectionOptions.conflictResolution);

        // Entry block size is set to the default value
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Complexity is set to the default value
        expect(manifest).toHaveProperty('complexity', defaultCollectionOptions.complexity);

        // Check write access is not granted to identity that is not the creator (owner)
        expect(env.updaterOwn.canWrite()).toEqual(false);

        // Check that own updater sees the entry created by other's updater
        expect(env.updaterOwn.numEntries()).toEqual(1);
    });

    it('inits existing empty public-read-only collection from address', async () => {
        // Construct other's updater with public read-only access
        const env = new UpdaterTestEnv();
        env.createOther({ publicAccess: AccessRights.Read });

        // Init the other updater (creates the collection) before our own (opens the collection)
        await env.initOther();

        // Add an entry to make the collection non-empty
        await env.updaterOther.add([{ _id: 'the-key' }]);

        // Construct own updater with public read-only access, providing address
        env.createOwn({ publicAccess: AccessRights.Read, address: env.updaterOther.address() });

        // ---
        await env.updaterOwn.init(env.name);
        // ---

        // Both the other and own updater have resolved to the same collection address
        expect(env.updaterOwn.address()).toEqual(env.updaterOther.address());

        // Manifest address is valid
        expect(env.updaterOwn.address()).toBeTruthy();
        const manifest = await env.content.getObject<ICollectionManifest>(env.updaterOwn.address());
        expect(manifest).toBeTruthy();

        // Collection name is set correctly
        expect(manifest).toHaveProperty('name', env.name);

        // Creator public key is set to other's public key
        expect(manifest).toHaveProperty('creatorPublicKey', env.publicKeyOther);

        // Public access is set to Read, as requested
        expect(manifest).toHaveProperty('publicAccess', 'Read');

        // Conflict resolution is set to the default value
        expect(manifest).toHaveProperty('conflictResolution', defaultCollectionOptions.conflictResolution);

        // Entry block size is set to the default value
        expect(manifest).toHaveProperty('entryBlockSize', defaultCollectionOptions.entryBlockSize);

        // Complexity is set to the default value
        expect(manifest).toHaveProperty('complexity', defaultCollectionOptions.complexity);

        // Check write access is not granted to identity that is not the creator (owner)
        expect(env.updaterOwn.canWrite()).toEqual(false);

        // Check that own updater sees the entry created by other's updater
        expect(env.updaterOwn.numEntries()).toEqual(1);
    });
});