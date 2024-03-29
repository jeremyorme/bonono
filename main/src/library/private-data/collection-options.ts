import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { AccessRights, accessRightsSchema } from '../public-data/access-rights';
import { ConflictResolution, conflictResolutionSchema } from '../public-data/conflict-resolution';

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

    /**
     * Conflict resolution mode.
     * @remarks Specifies how to resolve multiple writes to the same key
     * @defaultValue {@link ConflictResolution.LastWriteWins}
     */
    conflictResolution: ConflictResolution,

    /**
     * Entry signature complexity.
     * @remarks Required complexity of entry proof-of-work signatures.
     * If -1, no signature is required. Signatures with complexity > 0
     * are not portable between different collections.
     * @defaultValue -1
     */
    complexity: number;

    /**
     * Lower clock value (inclusive) of entries to be indexed.
     * @defaultValue 0
     */
    lowerClock: number;

    /**
     * Upper clock value (exclusive) of entries to be indexed.
     * @remarks Set to -1 to disable max clock constraint
     * @defaultValue -1
     */
    upperClock: number;

    /**
     * Public key of the store owner.
     * @remarks Set this to access a read-only store not owned by the current
     * identity. If left unset for a store that is not publicly writeable, this
     * defaults to the public key of the current user identity.
     * @defaultValue unset
     */
    creatorPublicKey: string;
}

export const defaultCollectionOptions: ICollectionOptions = {
    address: '',
    publicAccess: AccessRights.Read,
    entryBlockSize: 16,
    compactThreshold: 128,
    conflictResolution: ConflictResolution.LastWriteWins,
    complexity: -1,
    lowerClock: 0,
    upperClock: -1,
    creatorPublicKey: ''
};

const collectionOptionsSchema: JTDSchemaType<ICollectionOptions> = {
    properties: {
        address: { type: 'string' },
        publicAccess: accessRightsSchema,
        entryBlockSize: { type: 'uint32' },
        compactThreshold: { type: 'uint32' },
        conflictResolution: conflictResolutionSchema,
        complexity: { type: 'uint32' },
        lowerClock: { type: 'uint32' },
        upperClock: { type: 'uint32' },
        creatorPublicKey: { type: 'string' }
    }
};

export const validateCollectionOptions = ajv.compile(collectionOptionsSchema);
