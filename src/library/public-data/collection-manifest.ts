import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { ILogSink } from '../services/log-sink';
import { AccessRights, accessRightsSchema } from './access-rights';

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
        publicAccess: accessRightsSchema,
        entryBlockSize: { type: 'uint32' }
    }
};

export const validateCollectionManifest = ajv.compile(collectionManifestSchema);

export function isCollectionManifestValid(manifest: ICollectionManifest | null, address: string, log: ILogSink | null) {
    // check_exists(ICollectionManifest)
    if (!manifest) {
        log?.error('Collection manifest not found (address = ' + address + ')');
        return false;
    }

    // check_type(ICollectionManifest)
    if (!validateCollectionManifest(manifest)) {
        log?.error('Collection manifest invalid (address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}
