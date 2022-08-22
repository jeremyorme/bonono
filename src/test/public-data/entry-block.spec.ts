import { AccessRights } from '../../library/public-data/access-rights';
import { ICollectionManifest } from '../../library/public-data/collection-manifest';
import { IEntry } from '../../library/public-data/entry';
import { IEntryBlock, isEntryBlockValid } from '../../library/public-data/entry-block';
import { MockCryptoProvider } from '../test_util/mock-crypto-provider';
import { MockLogSink } from '../test_util/mock-log-sink';

describe('entry', () => {
    it('passes validation for a valid block', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlock: IEntryBlock = {
            entries: [entry]
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockValid(entryBlock, true, manifest, id, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if syntax validation fails', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entryBlock: IEntryBlock = {
            entries: [{} as IEntry]
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockValid(entryBlock, true, manifest, id, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing invalid block was ignored (address = ' + address + ')');
    });

    it('fails validation if last block is empty', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entryBlock: IEntryBlock = {
            entries: []
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockValid(entryBlock, true, manifest, id, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing block with invalid size was ignored (address = ' + address + ')');
    });

    it('fails validation if not-last block does not have entryBlockSize entries', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlock: IEntryBlock = {
            entries: [entry]
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockValid(entryBlock, false, manifest, id, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing block with invalid size was ignored (address = ' + address + ')');
    });

    it('fails validation if block has more than one entry in ReadAnyWriteOwn mode', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entryBlock: IEntryBlock = {
            entries: [{
                clock: 1,
                value: { _id: id }
            }, {
                clock: 2,
                value: { _id: id }
            }]
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockValid(entryBlock, true, manifest, id, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing multiple entries for ReadAnyWriteOwn store was ignored (address = ' + address + ')');
    });

    it('fails validation if the block contains invalid entries', async () => {
        const log = new MockLogSink();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlock: IEntryBlock = {
            entries: [entry]
        };

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockValid(entryBlock, true, manifest, id, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing entry not keyed by block owner identity for ReadAnyWriteOwn store was ignored (address = ' + address + ')');
    });
});
