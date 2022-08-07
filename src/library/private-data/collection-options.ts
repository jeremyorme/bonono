import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { AccessRights } from './access-rights';

const ajv = new Ajv();

export interface ICollectionOptions {
    address: string;
    publicAccess: AccessRights;
    entryBlockSize: number;
    compactThreshold: number;
}

export const defaultCollectionOptions: ICollectionOptions = {
    address: '',
    publicAccess: AccessRights.Read,
    entryBlockSize: 16,
    compactThreshold: 128
};

const collectionOptionsSchema: JTDSchemaType<ICollectionOptions> = {
    properties: {
        address: { type: 'string' },
        publicAccess: { enum: [AccessRights.None, AccessRights.Read, AccessRights.ReadWrite] },
        entryBlockSize: { type: 'uint32' },
        compactThreshold: { type: 'uint32' }
    }
};

export const validateCollectionOptions = ajv.compile(collectionOptionsSchema);
