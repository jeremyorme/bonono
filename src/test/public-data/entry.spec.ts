import { AccessRights } from '../../library/public-data/access-rights';
import { ICollectionManifest } from '../../library/public-data/collection-manifest';
import { IEntry, isEntryValid } from '../../library/public-data/entry';
import { MockCryptoProvider } from '../test_util/mock-crypto-provider';
import { MockLogSink } from '../test_util/mock-log-sink';

describe('entry', () => {
    it('passes validation for a valid entry', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryValid(entry, manifest, id, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('passes validation for a valid entry in ReadAnyWriteOwn mode', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: id }
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryValid(entry, manifest, id, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if entry is not keyed by entry block list owner identity', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryValid(entry, manifest, id, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing entry not keyed by block owner identity for ReadAnyWriteOwn store was ignored (address = ' + address + ')');
    });
});
