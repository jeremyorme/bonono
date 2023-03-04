import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';
import { IEntry, entrySchema, isEntryValid } from './entry';
import { ILogSink } from '../services/log-sink';
import { AccessRights } from './access-rights';
import { ICollectionManifest } from './collection-manifest';
import { ICryptoProvider } from '../services/crypto-provider';

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

export async function isEntryBlockValid(entryBlock: IEntryBlock | null, isLast: boolean, manifest: ICollectionManifest, publicKey: string, cryptoProvider: ICryptoProvider, address: string, log: ILogSink | null) {
    // check_exists(IEntryBlock)
    if (!entryBlock) {
        log?.warning('Update referencing missing block was ignored (address = ' + address + ')');
        return false;
    }

    // check_entry_block_syntax(IEntryBlock)
    if (!validateEntryBlock(entryBlock)) {
        log?.warning('Update containing invalid block was ignored (address = ' + address + ')');
        return false;
    }

    // check_num_entries(IEntryBlock.entries)
    if (!isLast && entryBlock.entries.length != manifest.entryBlockSize ||
        isLast && entryBlock.entries.length == 0) {
        log?.warning('Update containing block with invalid size was ignored (address = ' + address + ')');
        return false;
    }

    return (await Promise.all(entryBlock.entries.map(e => isEntryValid(e, manifest, publicKey, cryptoProvider, address, log)))).every(e => e);
}
