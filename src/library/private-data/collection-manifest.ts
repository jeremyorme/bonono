import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';

const ajv = new Ajv();

export interface ICollectionManifest {
    name: string;
    ownerIdentity: string;
}

const collectionManifestSchema: JTDSchemaType<ICollectionManifest> = {
    properties: {
        name: { type: 'string' },
        ownerIdentity: { type: 'string' }
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
