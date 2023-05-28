import { JTDSchemaType } from 'ajv/dist/jtd';
import { ICollectionManifest } from './collection-manifest';
import { AccessRights } from './access-rights';
import { ILogSink } from '../services/log-sink';
import { ICryptoProvider } from '../services/crypto-provider';
import { IProof, proofSchema } from './proof';

export interface IEntry {
    _id: string;
    _clock: number;
    _proof?: IProof;
}

export const entrySchema: JTDSchemaType<IEntry> = {
    properties: {
        _id: { type: 'string' },
        _clock: { type: 'uint32' }
    },
    optionalProperties: {
        _proof: proofSchema
    },
    additionalProperties: true
};

export async function isEntryValid(entry: IEntry, manifest: ICollectionManifest, publicKey: string, cryptoProvider: ICryptoProvider, address: string, log: ILogSink | null) {
    // check_id(IEntry._id, IEntryBlockList.publicKey)
    if (manifest.publicAccess == AccessRights.ReadAnyWriteOwn &&
        entry._id != publicKey) {
        log?.warning('Update to ReadAnyWriteOwn collection containing entry not keyed by writer\'s public key was ignored ' +
            '(entry id = ' + entry._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
        return false;
    }

    // check_complexity(IEntry._proof, ICollectionManifest.complexity)
    if (manifest.complexity > 0) {
        if (!entry._proof) {
            log?.warning('Update to collection containing entry with missing proof-of-work was ignored ' +
                '(entry id = ' + entry._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
            return false;
        }

        const proof = { ...entry._proof };
        delete entry._proof;

        if (!await cryptoProvider.verify_complex(entry, proof.signature, publicKey, address, proof.nonce, manifest.complexity)) {
            log?.warning('Update to collection containing entry with inadequate proof-of-work was ignored ' +
                '(entry id = ' + entry._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
            return false;
        }
    }

    // success!
    return true;
}