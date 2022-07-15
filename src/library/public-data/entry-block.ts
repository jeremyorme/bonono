import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { mergeArrays } from '../util/arrays';
import { IEntry, entrySchema, areEntriesValid } from './entry';
import { IEntryBlockList } from './entry-block-list';

const ajv = new Ajv();

export interface IEntryBlock {
    entries: IEntry[];
}

const entryBlockSchema: JTDSchemaType<IEntryBlock> = {
    properties: {
        entries: { elements: entrySchema }
    }
};

const validateEntryBlock = ajv.compile(entryBlockSchema);

export function areEntryBlocksValid(entryBlockList: IEntryBlockList, entryBlocks: (IEntryBlock | null)[], address: string) {
    if (!entryBlocks.every((entryBlock, i) => isEntryBlockValid(entryBlock, i == entryBlockList.entryBlockCids.length - 1, address)))
        return false;

    if (!areEntriesValid(mergeArrays(entryBlocks.map(entryBlock => entryBlock ? entryBlock.entries : [])), entryBlockList))
        return false;

    // success!
    return true;
}

export function isEntryBlockValid(entryBlock: IEntryBlock | null, isLast: boolean, address: string) {
    // check_exists(IEntryBlock)
    if (!entryBlock) {
        console.log('[Db] WARNING: Update referencing missing block was ignored (address = ' + address + ')');
        return false;
    }

    // check_entry_block_syntax(IEntryBlock)
    if (!validateEntryBlock(entryBlock)) {
        console.log('[Db] WARNING: Update containing invalid block was ignored (address = ' + address + ')');
        return false;
    }

    // check_num_entries(IEntryBlock.entries)
    if (!isLast && entryBlock.entries.length != this._options.entryBlockSize ||
        isLast && entryBlock.entries.length == 0) {
        console.log('[Db] WARNING: Update containing block with invalid size was ignored (address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}
