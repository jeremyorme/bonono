import { JTDSchemaType } from 'ajv/dist/jtd';
import { IObject, objectSchema } from './object';
import { ICollectionManifest } from './collection-manifest';
import { AccessRights } from './access-rights';
import { ILogSink } from '../services/log-sink';

export interface IEntry {
    value: IObject;
    clock: number;
}

export const entrySchema: JTDSchemaType<IEntry> = {
    properties: {
        value: objectSchema,
        clock: { type: 'uint32' }
    }
};

export function isEntryValid(entry: IEntry, manifest: ICollectionManifest, publicKey: string, address: string, log: ILogSink | null) {
    // check_id(IEntry.value._id, IEntryBlockList.ownerIdentity)
    if (manifest.publicAccess == AccessRights.ReadAnyWriteOwn &&
        entry.value?._id != publicKey) {
        log?.warning('Update to ReadAnyWriteOwn collection containing entry not keyed by writer\'s public key was ignored ' +
            '(entry id = ' + entry.value?._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}