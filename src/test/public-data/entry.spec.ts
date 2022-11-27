import { AccessRights } from '../../library/public-data/access-rights';
import { ICollectionManifest } from '../../library/public-data/collection-manifest';
import { ConflictResolution } from '../../library/public-data/conflict-resolution';
import { IEntry, isEntryValid } from '../../library/public-data/entry';
import { MockCryptoProvider } from '../test_util/mock-crypto-provider';
import { MockLogSink } from '../test_util/mock-log-sink';

describe('entry', () => {
    it('passes validation for a valid entry', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { value: { _id: 'id', _clock: 1 } };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity: 0
        };

        // ---
        const valid = await isEntryValid(entry, manifest, publicKey, crypto, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('passes validation for a valid entry in ReadAnyWriteOwn mode', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { value: { _id: publicKey, _clock: 1, } };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity: 0
        };

        // ---
        const valid = await isEntryValid(entry, manifest, publicKey, crypto, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if entry is not keyed by entry block list public key', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { value: { _id: 'id', _clock: 1, } };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity: 0
        };

        // ---
        const valid = await isEntryValid(entry, manifest, publicKey, crypto, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update to ReadAnyWriteOwn collection containing entry not keyed by writer\'s public key was ignored ' +
            '(entry id = ' + entry.value._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
    });

    it('passes validation for a valid entry with required proof of work', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { value: { _id: 'id', _clock: 1 } };
        const complexity = 4;
        const [signature, nonce] = await crypto.sign_complex(entry, address, complexity);
        entry.proofOfWork = { signature, nonce };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity
        };

        // ---
        const valid = await isEntryValid(entry, manifest, publicKey, crypto, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if entry is missing required proof of work', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { value: { _id: 'id', _clock: 1 } };
        const complexity = 4;
        const [signature, nonce] = await crypto.sign_complex(entry, address, complexity);
        entry.proofOfWork = { signature, nonce };

        const requiredComplexity = 32;
        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity: requiredComplexity
        };

        // ---
        const valid = await isEntryValid(entry, manifest, publicKey, crypto, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update to collection containing entry with missing or inadequate proof-of-work was ignored (entry id = ' +
            entry.value._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
    });

    it('fails validation if entry has inadequate proof of work', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { value: { _id: 'id', _clock: 1 } };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16,
            conflictResolution: ConflictResolution.LastWriteWins,
            complexity: 1
        };

        // ---
        const valid = await isEntryValid(entry, manifest, publicKey, crypto, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update to collection containing entry with missing or inadequate proof-of-work was ignored (entry id = ' +
            entry.value._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
    });
});
