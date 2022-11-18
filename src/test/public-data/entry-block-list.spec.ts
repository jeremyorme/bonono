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
        const publicKey = await crypto.publicKey();
        const entry: IEntry = {
            clock: 1,
            value: { _id: 'id' }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
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
        const publicKey = await crypto.publicKey();
        const entry: IEntry = {
            clock: 1,
            value: { _id: publicKey }
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
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
        const validBlocks = await areEntryBlocksValid(await Promise.all(entryBlockList.entryBlockCids.map(cid => content.getObject<IEntryBlock>(cid))), [], entryBlockList, address, manifest, log);
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
            creatorPublicKey: await crypto.publicKey(),
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
            creatorPublicKey: await crypto.publicKey(),
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
            creatorPublicKey: await cryptoOwner.publicKey(),
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
            creatorPublicKey: await crypto.publicKey(),
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
            creatorPublicKey: await crypto.publicKey(),
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
        entryBlockList.publicKey = 'LIUQGJDA,HDAS';

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: entryBlockList.publicKey,
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };


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
            creatorPublicKey: await crypto.publicKey(),
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
        const validBlocks = await areEntryBlocksValid(await Promise.all(entryBlockList.entryBlockCids.map(cid => content.getObject<IEntryBlock>(cid))), [], entryBlockList, address, manifest, log);
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
            creatorPublicKey: await crypto.publicKey(),
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
        const validBlocks = await areEntryBlocksValid(await Promise.all(entryBlockList.entryBlockCids.map(cid => content.getObject<IEntryBlock>(cid))), [], entryBlockList, address, manifest, log);
        // ---

        expect(validBlocks).toBeFalsy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update containing incorrect clock was ignored (address = ' + address + ')');
    });

    it('fails validation for a block list that mutates the only existing entry', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const existing_entry = {
            clock: 1,
            value: { _id: publicKey, data: "existing" }
        };
        const existing_entry_block: IEntryBlock = { entries: [existing_entry] };
        const new_entry = {
            clock: 1,
            value: { _id: publicKey, data: "new" }
        };
        const new_entry_block: IEntryBlock = { entries: [new_entry] };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([[new_entry]], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };

        // ---
        const validBlocks = await areEntryBlocksValid([new_entry_block], [existing_entry_block], entryBlockList, address, manifest, log);
        // ---

        expect(validBlocks).toBeFalsy();
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update attempting to rewrite history was ignored (address = ' + address + ')');
    });

    it('fails validation for a block list that removes an effective entry', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        // Existing history is 4 entries with incrementing count
        const existing_entry_block: IEntryBlock = {
            entries: [{
                clock: 1,
                value: { _id: publicKey, data: 1 }
            } as IEntry,
            {
                clock: 2,
                value: { _id: publicKey, data: 2 }
            } as IEntry,
            {
                clock: 3,
                value: { _id: publicKey, data: 3 }
            } as IEntry,
            {
                clock: 4,
                value: { _id: publicKey, data: 4 }
            } as IEntry]
        };

        // Add a new entry (5) and also remove an existing one (4)
        const new_entry_block: IEntryBlock = {
            entries: [{
                clock: 1,
                value: { _id: publicKey, data: 1 }
            } as IEntry,
            {
                clock: 2,
                value: { _id: publicKey, data: 2 }
            } as IEntry,
            {
                clock: 3,
                value: { _id: publicKey, data: 3 }
            } as IEntry,
            {
                clock: 5,
                value: { _id: publicKey, data: 5 }
            } as IEntry]
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([new_entry_block.entries], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };

        // ---
        const validBlocks = await areEntryBlocksValid([new_entry_block], [existing_entry_block], entryBlockList, address, manifest, log);
        // ---

        expect(validBlocks).toBeFalsy();
        expect(log.warnings.length).toEqual(1);
        expect(log.warnings[0]).toEqual('Update attempting to rewrite history was ignored (address = ' + address + ')');
    });

    it('passes validation for a block list that removes an non-effective entry', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();

        // Existing history is 4 entries with incrementing count
        const existing_entry_block: IEntryBlock = {
            entries: [{
                clock: 1,
                value: { _id: publicKey, data: 1 }
            } as IEntry,
            {
                clock: 2,
                value: { _id: publicKey, data: 2 }
            } as IEntry,
            {
                clock: 3,
                value: { _id: publicKey, data: 3 }
            } as IEntry,
            {
                clock: 4,
                value: { _id: publicKey, data: 4 }
            } as IEntry]
        };

        // Add a new entry (5) and also remove an existing non-effective one (3)
        const new_entry_block: IEntryBlock = {
            entries: [{
                clock: 1,
                value: { _id: publicKey, data: 1 }
            } as IEntry,
            {
                clock: 2,
                value: { _id: publicKey, data: 2 }
            } as IEntry,
            {
                clock: 4,
                value: { _id: publicKey, data: 4 }
            } as IEntry,
            {
                clock: 5,
                value: { _id: publicKey, data: 5 }
            } as IEntry]
        };
        const entryBlockList: IEntryBlockList = await makeEntryBlockList([new_entry_block.entries], content, crypto);

        const manifest: ICollectionManifest = {
            name: 'my-store',
            creatorPublicKey: publicKey,
            publicAccess: AccessRights.Read,
            entryBlockSize: 16
        };

        // ---
        const validBlocks = await areEntryBlocksValid([new_entry_block], [existing_entry_block], entryBlockList, address, manifest, log);
        // ---

        expect(validBlocks).toBeTruthy();
        expect(log.warnings.length).toEqual(0);
        expect(log.errors.length).toEqual(0);
    });
});
