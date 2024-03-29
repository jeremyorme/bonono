import { IEntry } from '../../library/public-data/entry';
import { IEntryBlock } from '../../library/public-data/entry-block';
import { IEntryBlockList } from '../../library/public-data/entry-block-list';
import { IContentAccessor } from '../../library/services/content-accessor';
import { ICryptoProvider } from '../../library/services/crypto-provider';
import { mergeArrays } from '../../library/util/arrays';

export async function makeEntryBlockList(entries: IEntry[][], content: IContentAccessor, crypto: ICryptoProvider) {
    const entryBlocks: IEntryBlock[] = entries.map(entries => ({ entries }));

    const entryBlockList: IEntryBlockList = {
        entryBlockCids: await Promise.all(entryBlocks.map(entryBlock => content.putObject(entryBlock))),
        clock: Math.max(...mergeArrays(entryBlocks.map(eb => eb.entries)).map(e => e._clock)),
        publicKey: await crypto.publicKey(),
        signature: ''
    };
    entryBlockList.signature = await crypto.sign(entryBlockList);

    return entryBlockList;
}