import { JTDSchemaType } from 'ajv/dist/jtd';
import { ISigningProvider } from '../services/signing-provider';

export interface IEntryBlockList {
    ownerIdentity: string;
    entryBlockCids: string[];
    clock: number;
    publicKey: string;
    signature: string;
}

export const entryBlockListSchema: JTDSchemaType<IEntryBlockList> = {
    properties: {
        ownerIdentity: { type: 'string' },
        entryBlockCids: { elements: { type: 'string' } },
        clock: { type: 'uint32' },
        publicKey: { type: 'string' },
        signature: { type: 'string' }
    }
};

export async function isEntryBlockListValid(entryBlockList: IEntryBlockList, signingProvider: ISigningProvider, ownerIdentity: string, address: string) {
    // check_num_entry_blocks(IEntryBlockList.entryBlockCids);
    if (entryBlockList.entryBlockCids.length == 0) {
        console.log('[Db] WARNING: Empty update was ignored (address = ' + address + ')');
        return false;
    }

    // check_has_write_access(IEntryBlockList.ownerIdentity, ICollectionManifest.ownerIdentity)
    if (ownerIdentity != '*' && ownerIdentity != entryBlockList.ownerIdentity) {
        console.log('[Db] WARNING: Update containing illegal write was ignored (address = ' + address + ')');
        return false;
    }

    // check_signature(IEntryBlockList.publicKey, IEntryBlockList.signature)
    const validSignature = await signingProvider.verify(
        { ...entryBlockList, signature: '' },
        entryBlockList.signature,
        entryBlockList.publicKey);
    if (!validSignature) {
        console.log('[Db] WARNING: Update without valid signature was ignored (address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}
