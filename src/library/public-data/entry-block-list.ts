import { JTDSchemaType } from 'ajv/dist/jtd';
import { AccessRights } from './access-rights';
import { ICollectionManifest } from './collection-manifest';
import { ICryptoProvider } from '../services/crypto-provider';
import { ILogSink } from '../services/log-sink';
import { IEntryBlock, isEntryBlockValid } from './entry-block';
import { mergeArrays } from '../util/arrays';
import { IEntry } from './entry';

export interface IEntryBlockList {
    entryBlockCids: string[];
    clock: number;
    publicKey: string;
    signature: string;
}

export const entryBlockListSchema: JTDSchemaType<IEntryBlockList> = {
    properties: {
        entryBlockCids: { elements: { type: 'string' } },
        clock: { type: 'uint32' },
        publicKey: { type: 'string' },
        signature: { type: 'string' }
    }
};

export async function isEntryBlockListValid(entryBlockList: IEntryBlockList, cryptoProvider: ICryptoProvider, manifest: ICollectionManifest, address: string, log: ILogSink | null) {
    // check_num_entry_blocks(IEntryBlockList.entryBlockCids);
    if (entryBlockList.entryBlockCids.length == 0) {
        log?.warning('Empty update was ignored (address = ' + address + ')');
        return false;
    }

    // check_num_entry_blocks(IEntryBlockList.entryBlockCids);
    if (manifest.publicAccess == AccessRights.ReadAnyWriteOwn &&
        entryBlockList.entryBlockCids.length > 1) {
        log?.warning('Update containing multiple blocks for ReadAnyWriteOwn store was ignored (address = ' + address + ')');
        return false;
    }

    // check_has_write_access(IEntryBlockList.ownerIdentity, ICollectionManifest.ownerIdentity)
    if (manifest.publicAccess != AccessRights.ReadWrite && manifest.creatorPublicKey != entryBlockList.publicKey) {
        log?.warning('Update containing illegal write was ignored (address = ' + address + ')');
        return false;
    }

    // check_signature(IEntryBlockList.publicKey, IEntryBlockList.signature)
    const validSignature = await cryptoProvider.verify(
        { ...entryBlockList, signature: '' },
        entryBlockList.signature,
        entryBlockList.publicKey);
    if (!validSignature) {
        log?.warning('Update without valid signature was ignored (address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}

export function areEntryBlocksValid(entryBlockList: IEntryBlockList, entryBlocks: (IEntryBlock | null)[], address: string, manifest: ICollectionManifest, log: ILogSink | null) {
    return entryBlocks.every((entryBlock, i) => isEntryBlockValid(entryBlock, i == entryBlockList.entryBlockCids.length - 1, manifest, entryBlockList.publicKey, address, log)) &&
        areMergedEntriesValid(mergeArrays(entryBlocks.map(entryBlock => entryBlock ? entryBlock.entries : [])), entryBlockList, address, log);
}

export function areMergedEntriesValid(entries: (IEntry | null)[], entryBlockList: IEntryBlockList, address: string, log: ILogSink | null) {
    // check_strictly_increasing(IEntry.clock, IEntry.clock)
    if (!entries.reduce((p, c) => !p || !c ? null : p.clock < c.clock ? c : null)) {
        log?.warning('Update containing non-increasing clocks was ignored (address = ' + address + ')');
        return false;
    }

    // check_max(IEntryBlockList.clock, IEntry.clock)
    const lastEntry = entries.slice(-1)[0];
    if (lastEntry && lastEntry.clock != entryBlockList.clock) {
        log?.warning('Update containing incorrect clock was ignored (address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}
