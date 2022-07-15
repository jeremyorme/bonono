import { JTDSchemaType } from 'ajv/dist/jtd';
import { IObject, objectSchema } from './object';
import { IEntryBlockList } from './entry-block-list';

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

export function areEntriesValid(entries: (IEntry | null)[], entryBlockList: IEntryBlockList) {
    // check_strictly_increasing(IEntry.clock, IEntry.clock)
    if (!entries.reduce((p, c) => !p || !c ? null : p.clock < c.clock ? c : null)) {
        console.log('[Db] WARNING: Update containing non-increasing clocks was ignored (address = ' + this._address + ')');
        return false;
    }

    // check_max(IEntryBlockList.clock, IEntry.clock)
    const lastEntry = entries.slice(-1)[0];
    if (lastEntry && lastEntry.clock != entryBlockList.clock) {
        console.log('[Db] WARNING: Update containing incorrect clock was ignored (address = ' + this._address + ')');
        return false;
    }

    // success!
    return true;
}
