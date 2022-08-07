import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { AccessRights } from './access-rights';

const ajv = new Ajv();

export interface ICollectionManifest {
    name: string;
    creatorIdentity: string;
    publicAccess: AccessRights;
    entryBlockSize: number;
}

const collectionManifestSchema: JTDSchemaType<ICollectionManifest> = {
    properties: {
        name: { type: 'string' },
        creatorIdentity: { type: 'string' },
        publicAccess: { enum: [AccessRights.None, AccessRights.Read, AccessRights.ReadWrite] },
        entryBlockSize: { type: 'uint32' }
    }
};

export const validateCollectionManifest = ajv.compile(collectionManifestSchema);

export function isCollectionManifestValid(manifest: ICollectionManifest | null, address: string) {
    // check_exists(ICollectionManifest)
    if (!manifest) {
        console.log('[Db] ERROR: Collection manifest not found (address = ' + address + ')');
        return false;
    }

    // check_type(ICollectionManifest)
    if (!validateCollectionManifest(manifest)) {
        console.log('[Db] ERROR: Collection manifest invalid (address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}
