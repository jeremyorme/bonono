import { JTDSchemaType } from 'ajv/dist/jtd';
import { IObject, objectSchema } from './object';
import { IEntryBlockList } from './entry-block-list';
import { ICollectionManifest } from '../private-data/collection-manifest';
import { AccessRights } from '../private-data/access-rights';

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

export function areEntriesValid(entries: (IEntry | null)[], entryBlockList: IEntryBlockList, address: string, manifest: ICollectionManifest, selfIdentity: string) {
    // check_strictly_increasing(IEntry.clock, IEntry.clock)
    if (!entries.reduce((p, c) => !p || !c ? null : p.clock < c.clock ? c : null)) {
        console.log('[Db] WARNING: Update containing non-increasing clocks was ignored (address = ' + address + ')');
        return false;
    }

    // check_max(IEntryBlockList.clock, IEntry.clock)
    const lastEntry = entries.slice(-1)[0];
    if (lastEntry && lastEntry.clock != entryBlockList.clock) {
        console.log('[Db] WARNING: Update containing incorrect clock was ignored (address = ' + address + ')');
        return false;
    }

    // check_value(IEntry.value)
    if (manifest.publicAccess == AccessRights.ReadAnyWriteOwn) {
        if (entries.length > 1) {
            console.log('[Db] WARNING: Update containing multiple entries for ReadAnyWriteOwn store was ignored (address = ' + address + ')');
            return false;
        }
        if (entries.length > 0 && entries[0]?.value?._id != selfIdentity) {
            console.log('[Db] WARNING: Update containing entry not keyed by own identity for ReadAnyWriteOwn store was ignored (address = ' + address + ')');
            return false;
        }
    }

    // success!
    return true;
}
