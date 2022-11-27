import { JTDSchemaType } from 'ajv/dist/jtd';
import { IObject, objectSchema } from './object';
import { ICollectionManifest } from './collection-manifest';
import { AccessRights } from './access-rights';
import { ILogSink } from '../services/log-sink';
import { IProofOfWork, proofOfWorkSchema } from './proof-of-work';
import { ICryptoProvider } from '../services/crypto-provider';

export interface IEntry {
    value: IObject;
    proofOfWork?: IProofOfWork;
}

export const entrySchema: JTDSchemaType<IEntry> = {
    properties: {
        value: objectSchema
    },
    optionalProperties: {
        proofOfWork: proofOfWorkSchema
    }
};

export async function isEntryValid(entry: IEntry, manifest: ICollectionManifest, publicKey: string, cryptoProvider: ICryptoProvider, address: string, log: ILogSink | null) {
    // check_id(IEntry.value._id, IEntryBlockList.ownerIdentity)
    if (manifest.publicAccess == AccessRights.ReadAnyWriteOwn &&
        entry.value?._id != publicKey) {
        log?.warning('Update to ReadAnyWriteOwn collection containing entry not keyed by writer\'s public key was ignored ' +
            '(entry id = ' + entry.value?._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
        return false;
    }

    // check_complexity(IEntry.proofOfWork, ICollectionManifest.complexity)
    if (manifest.complexity > 0 && (entry.proofOfWork == null ||
        !await cryptoProvider.verify_complex({ value: entry.value }, entry.proofOfWork.signature, publicKey, address, entry.proofOfWork.nonce, manifest.complexity))) {
        log?.warning('Update to collection containing entry with missing or inadequate proof-of-work was ignored ' +
            '(entry id = ' + entry.value?._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
        return false;
    }

    // success!
    return true;
}