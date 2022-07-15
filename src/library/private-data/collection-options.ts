import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';

const ajv = new Ajv();

export interface ICollectionOptions {
    address: string;
    isPublic: boolean;
    entryBlockSize: number;
    compactThreshold: number;
}

export const defaultCollectionOptions: ICollectionOptions = {
    address: '',
    isPublic: false,
    entryBlockSize: 16,
    compactThreshold: 128
};

const collectionOptionsSchema: JTDSchemaType<ICollectionOptions> = {
    properties: {
        address: { type: 'string' },
        isPublic: { type: 'boolean' },
        entryBlockSize: { type: 'uint32' },
        compactThreshold: { type: 'uint32' }
    }
};

export const validateCollectionOptions = ajv.compile(collectionOptionsSchema);
