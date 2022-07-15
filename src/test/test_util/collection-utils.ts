import { IEntry } from "../../library/public-data/entry";
import { IEntryBlock } from "../../library/public-data/entry-block";
import { IEntryBlockList } from "../../library/public-data/entry-block-list";
import { IContentAccessor } from "../../library/services/content-accessor";
import { ISigningProvider } from "../../library/services/signing-provider";
import { mergeArrays } from "../../library/util/arrays";

export async function make_entry_block_list(entries: IEntry[][], content: IContentAccessor, signing: ISigningProvider) {
    const entryBlocks: IEntryBlock[] = entries.map(entries => ({ entries }));

    const id = await signing.id()
    const entryBlockList: IEntryBlockList = {
        ownerIdentity: id,
        entryBlockCids: await Promise.all(entryBlocks.map(entryBlock => content.putObject(entryBlock))),
        clock: Math.max(...mergeArrays(entryBlocks.map(eb => eb.entries)).map(e => e.clock)),
        publicKey: await signing.publicKey(),
        signature: ''
    };
    entryBlockList.signature = await signing.sign(entryBlockList);

    return entryBlockList;
}