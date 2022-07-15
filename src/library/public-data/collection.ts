import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { ISigningProvider } from '../services/signing-provider';
import { IEntryBlockList, entryBlockListSchema, isEntryBlockListValid } from './entry-block-list';

const ajv = new Ajv();

export interface ICollection {
    senderIdentity: string;
    address: string;
    entryBlockLists: IEntryBlockList[];
    addCount: number;
}

const collectionSchema: JTDSchemaType<ICollection> = {
    properties: {
        senderIdentity: { type: 'string' },
        address: { type: 'string' },
        entryBlockLists: { elements: entryBlockListSchema },
        addCount: { type: 'uint32' }
    }
};

export const validateCollection = ajv.compile(collectionSchema);

export async function isCollectionValid(collection: ICollection | null, signingProvider: ISigningProvider, ownerIdentity: string, address: string) {
    // check_exists(ICollection)
    if (!collection) {
        console.log('[Db] ERROR: Collection structure not found (address = ' + address + ')');
        return false;
    }

    // check_type(ICollection)
    if (!validateCollection(collection)) {
        console.log('[Db] ERROR: Collection structure invalid (address = ' + address + ')');
        return false;
    }

    const blocksValid = await Promise.all(collection.entryBlockLists.map(
        entryBlockList => isEntryBlockListValid(entryBlockList, signingProvider, ownerIdentity, address)));

    return blocksValid.every(b => b);
}
