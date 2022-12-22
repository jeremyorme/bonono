import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { IEntryBlockList, entryBlockListSchema } from './entry-block-list';
import { ILogSink } from '../services/log-sink';

const ajv = new Ajv();

export interface ICollection {
    senderPublicKey: string;
    address: string;
    entryBlockLists: IEntryBlockList[];
    addCount: number;
}

const collectionSchema: JTDSchemaType<ICollection> = {
    properties: {
        senderPublicKey: { type: 'string' },
        address: { type: 'string' },
        entryBlockLists: { elements: entryBlockListSchema },
        addCount: { type: 'uint32' }
    }
};

export const validateCollection = ajv.compile(collectionSchema);

export async function isCollectionValid(collection: ICollection | null, address: string, log: ILogSink | null) {
    // check_exists(ICollection)
    if (!collection) {
        log?.error('Collection structure not found (address = ' + address + ')');
        return false;
    }

    // check_type(ICollection)
    if (!validateCollection(collection)) {
        log?.error('Collection structure invalid (address = ' + address + ')');
        return false;
    }

    return true;
}
