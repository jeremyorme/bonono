import { AccessRights } from '../../library/public-data/access-rights';
import { ICollectionManifest } from '../../library/public-data/collection-manifest';
import { IEntry } from '../../library/public-data/entry';
import { IEntryBlock } from '../../library/public-data/entry-block';
import { areEntryBlocksValid, IEntryBlockList, isEntryBlockListValid } from '../../library/public-data/entry-block-list';
import { makeEntryBlockList } from '../test_util/collection-utils';
import { MockContentStorage } from '../test_util/mock-content-storage';
import { MockCryptoProvider } from '../test_util/mock-crypto-provider';
import { MockLogSink } from '../test_util/mock-log-sink';

describe('entry block list', () => {
    it('passes validation for a valid block list', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadWrite,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('passes validation for a valid block list in ReadAnyWriteOwn mode', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const id = await crypto.id();
        const entry: IEntry = {
            clock: 1,
            value: { _id: id }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: id,
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16
        };

        // ---
        const validList = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(validList).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);

        // ---
        const validBlocks = await areEntryBlocksValid(entryBlockList, await Promise.all(entryBlockList.entryBlockCids.map(cid => content.getObject<IEntryBlock>(cid))), address, manifest, log);
        // ---

        expect(validBlocks).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if block list has no blocks', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await crypto.id(),
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Empty update was ignored (address = ' + address + ')');
    });

    it('fails validation if block list has more than one block in ReadAnyWriteOwn mode', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[], []], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await crypto.id(),
            publicAccess: AccessRights.ReadAnyWriteOwn,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing multiple blocks for ReadAnyWriteOwn store was ignored (address = ' + address + ')');
    });

    it('fails validation if write access is not granted', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const cryptoOwner = new MockCryptoProvider('test-id-own');
        const cryptoWriter = new MockCryptoProvider('test-id-wr');
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, cryptoWriter);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await cryptoOwner.id(),
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };

        // ---
        const valid = await isEntryBlockListValid(entryBlockList, cryptoWriter, manifest, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing illegal write was ignored (address = ' + address + ')');
    });

    it('fails validation if the signature and public key do not match the block list', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await crypto.id(),
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };

        entryBlockList.clock = 2;

        // ---
        const valid = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update without valid signature was ignored (address = ' + address + ')');
    });

    it('fails validation if the signature is invalid', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await crypto.id(),
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };

        entryBlockList.signature = 'sfasdfdskljgahsd';

        // ---
        const valid = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update without valid signature was ignored (address = ' + address + ')');
    });


    it('fails validation if the public key is invalid', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await crypto.id(),
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };

        entryBlockList.publicKey = 'LIUQGJDA,HDAS';

        // ---
        const valid = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update without valid signature was ignored (address = ' + address + ')');
    });

    it('fails validation if clocks not strictly increasing', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const entryBlockList: IEntryBlockList = await makeEntryBlockList(
            [
                [{
                    clock: 2,
                    value: { _id: 'id' }
                }, {
                    clock: 1,
                    value: { _id: 'id' }
                }],
                [{
                    clock: 0,
                    value: { _id: 'id' }
                }, {
                    clock: 3,
                    value: { _id: 'id' }
                }]
            ], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await crypto.id(),
            publicAccess: AccessRights.Read,
            entryBlockSize: 2
        };

        // ---
        const validList = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(validList).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);

        // ---
        const validBlocks = await areEntryBlocksValid(entryBlockList, await Promise.all(entryBlockList.entryBlockCids.map(cid => content.getObject<IEntryBlock>(cid))), address, manifest, log);
        // ---

        expect(validBlocks).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing non-increasing clocks was ignored (address = ' + address + ')');
    });

    it('fails validation if max clock is incorrect', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const entryBlockList: IEntryBlockList = await makeEntryBlockList(
            [
                [{
                    clock: 0,
                    value: { _id: 'id' }
                }, {
                    clock: 1,
                    value: { _id: 'id' }
                }],
                [{
                    clock: 2,
                    value: { _id: 'id' }
                }, {
                    clock: 3,
                    value: { _id: 'id' }
                }]
            ], content, crypto);
        entryBlockList.clock = 5;
        entryBlockList.signature = '';
        entryBlockList.signature = await crypto.sign(entryBlockList);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorIdentity: await crypto.id(),
            publicAccess: AccessRights.Read,
            entryBlockSize: 2
        };

        // ---
        const validList = await isEntryBlockListValid(entryBlockList, crypto, manifest, address, log);
        // ---

        expect(validList).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);

        // ---
        const validBlocks = await areEntryBlocksValid(entryBlockList, await Promise.all(entryBlockList.entryBlockCids.map(cid => content.getObject<IEntryBlock>(cid))), address, manifest, log);
        // ---

        expect(validBlocks).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing incorrect clock was ignored (address = ' + address + ')');
    });
});
