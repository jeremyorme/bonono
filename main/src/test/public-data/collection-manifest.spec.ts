import { AccessRights } from '../../library/public-data/access-rights';
import { ICollectionManifest, isCollectionManifestValid } from '../../library/public-data/collection-manifest';
import { ConflictResolution } from '../../library/public-data/conflict-resolution';
import { MockCryptoProvider } from '../test_util/mock-crypto-provider';
import { MockLogSink } from '../test_util/mock-log-sink';

describe('collection manifest', () => {
    it('passes validation for a valid collection manifest', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity: 0
        };

        // ---
        const valid = isCollectionManifestValid(manifest, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if collection manifest is null', async () => {
        const log = new MockLogSink();
        const address = 'store-address';

        // ---
        const valid = isCollectionManifestValid(null, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(1);
        expect(log.errors[0]).toEqual('Collection manifest not found (address = ' + address + ')');
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if syntax validation fails', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 1.3,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity: 0
        };

        // ---
        const valid = isCollectionManifestValid(manifest, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(1);
        expect(log.errors[0]).toEqual('Collection manifest invalid (address = ' + address + ')');
        expect(log.warnings.length).toEqual(0);
    });
});
