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

    // check_has_write_access(IEntryBlockList.publicKey, ICollectionManifest.creatorPublicKey)
    const isPrivateWriteAccess =
        manifest.publicAccess == AccessRights.Read ||
        manifest.publicAccess == AccessRights.None;
    if (isPrivateWriteAccess && manifest.creatorPublicKey != entryBlockList.publicKey) {
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

export async function areEntryBlocksValid(entryBlocks: (IEntryBlock | null)[], originalEntryBlocks: (IEntryBlock | null)[], entryBlockList: IEntryBlockList, cryptoProvider: ICryptoProvider, address: string, manifest: ICollectionManifest, log: ILogSink | null) {
    if (!(await Promise.all(entryBlocks.map((entryBlock, i) => isEntryBlockValid(entryBlock, i == entryBlockList.entryBlockCids.length - 1, manifest, entryBlockList.publicKey, cryptoProvider, address, log)))).every(e => e))
        return false;

    return areEntryBlockListEntriesValid(
        mergeArrays(entryBlocks.map(entryBlock => entryBlock ? entryBlock.entries : [])),
        mergeArrays(originalEntryBlocks.map(originalEntryBlock => originalEntryBlock ? originalEntryBlock.entries : [])),
        entryBlockList,
        address,
        log);
}

export function areEntryBlockListEntriesValid(entries: (IEntry | null)[], originalEntries: (IEntry | null)[], entryBlockList: IEntryBlockList, address: string, log: ILogSink | null) {
    // check_strictly_increasing(IEntry.clock, IEntry.clock)
    if (!entries.reduce((p, c) => !p || !c ? null : p._clock < c._clock ? c : null)) {
        log?.warning('Update containing non-increasing clocks was ignored (address = ' + address + ')');
        return false;
    }

    // check_max(IEntryBlockList.clock, IEntry.clock)
    const lastEntry = entries.slice(-1)[0];
    if (lastEntry && lastEntry._clock != entryBlockList.clock) {
        log?.warning('Update containing incorrect clock was ignored (address = ' + address + ')');
        return false;
    }

    // check_history(IEntryBlockList.entryBlockCids, IEntryBlockList.entryBlockCids)
    const originalEntryMap: Map<string, IEntry> = new Map();
    const historicalEntryMap: Map<string, IEntry> = new Map();
    const lastOriginalEntry = originalEntries.slice(-1)[0];
    const lastOriginalEntryClock = lastOriginalEntry ? lastOriginalEntry._clock : 0;
    originalEntries.forEach(e => { if (e) originalEntryMap.set(e._id, e) });
    entries.forEach(e => { if (e && e._clock <= lastOriginalEntryClock) historicalEntryMap.set(e._id, e) });
    const originalString = JSON.stringify([...originalEntryMap.entries()]);
    const historicalString = JSON.stringify([...historicalEntryMap.entries()]);
    if (originalString != historicalString) {
        log?.warning('Update attempting to rewrite history was ignored (address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}
