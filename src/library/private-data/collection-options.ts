import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { AccessRights, accessRightsSchema } from '../public-data/access-rights';

const ajv = new Ajv();

/**
 * Options for creating/opening a collection.
 */
export interface ICollectionOptions {
    /**
     * Store address.
     * @remarks Set this to open an existing store
     * @defaultValue unset (i.e. create new store)
     */
    address: string;

    /**
     * Public access rights.
     * @remarks Determines the access rights for peers other than the creator.
     * @defaultValue {@link AccessRights.Read}
     */
    publicAccess: AccessRights;

    /**
     * Entry block size.
     * @remarks Specifies the number of entries to batch in a block.
     * @defaultValue 16
     */
    entryBlockSize: number;

    /**
     * Compact threshold.
     * @remarks Specifies the number of inserts after which a compaction should
     * be triggered.
     * @defaultValue 128
     */
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
        publicAccess: accessRightsSchema,
        entryBlockSize: { type: 'uint32' },
        compactThreshold: { type: 'uint32' }
    }
};

export const validateCollectionOptions = ajv.compile(collectionOptionsSchema);
