import { ICollection, isCollectionValid } from '../../library/public-data/collection';
import { IEntry } from '../../library/public-data/entry';
import { makeEntryBlockList } from '../test_util/collection-utils';
import { MockContentStorage } from '../test_util/mock-content-storage';
import { MockCryptoProvider } from '../test_util/mock-crypto-provider';
import { MockLogSink } from '../test_util/mock-log-sink';

describe('collection', () => {
    it('passes validation for a valid collection', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { _id: 'id', _clock: 1 };
        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: address,
            entryBlockLists: [await makeEntryBlockList([[entry]], content, crypto)],
            addCount: 1
        };

        // ---
        const valid = await isCollectionValid(collection, address, log);
        // ---

        expect(valid).toBeTruthy();
        expect(log.errors.length).toEqual(0);
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if collection is null', async () => {
        const log = new MockLogSink();
        const address = 'store-address';

        // ---
        const valid = await isCollectionValid(null, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(1);
        expect(log.errors[0]).toEqual('Collection structure not found (address = ' + address + ')');
        expect(log.warnings.length).toEqual(0);
    });

    it('fails validation if syntax validation fails', async () => {
        const log = new MockLogSink();
        const content = new MockContentStorage();
        const address = 'store-address';
        const crypto = new MockCryptoProvider('test-id');
        const publicKey = await crypto.publicKey();
        const entry: IEntry = { _id: 'id', _clock: 1 };
        const collection: ICollection = {
            senderPublicKey: publicKey,
            address: address,
            entryBlockLists: [await makeEntryBlockList([[entry]], content, crypto)],
            addCount: 1.9
        };

        // ---
        const valid = await isCollectionValid(collection, address, log);
        // ---

        expect(valid).toBeFalsy();
        expect(log.errors.length).toEqual(1);
        expect(log.errors[0]).toEqual('Collection structure invalid (address = ' + address + ')');
        expect(log.warnings.length).toEqual(0);
    });
});
