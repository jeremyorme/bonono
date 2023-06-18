import { JTDSchemaType } from 'ajv/dist/jtd';
import { ICryptoProvider } from '../services/crypto-provider';
import { ILogSink } from '../services/log-sink';
import { ICollectionManifest } from './collection-manifest';
import { IEntry } from './entry';

export interface IProof {
    signature: string;
    nonce: string;
    publicKey?: string;
}

export const proofSchema: JTDSchemaType<IProof> = {
    properties: {
        signature: { type: 'string' },
        nonce: { type: 'string' }
    },
    optionalProperties: {
        publicKey: { type: 'string' }
    }
}

export async function isProofValid(entry: IEntry, manifest: ICollectionManifest, publicKey: string, cryptoProvider: ICryptoProvider, address: string, log: ILogSink | null) {
    // check_complexity(IEntry._proof, ICollectionManifest.complexity)
    if (manifest.complexity >= 0) {
        if (!entry._proof) {
            log?.warning('Update to collection containing entry with missing proof-of-work was ignored ' +
                '(entry id = ' + entry._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
            return false;
        }

        const proof = { ...entry._proof };
        delete entry._proof;

        const signerPublicKey = manifest.complexity == 0 ? proof.publicKey : publicKey;
        if (!signerPublicKey) {
            log?.warning('Update to collection containing entry with proof-of-work having no signer public key was ignored ' +
                '(entry id = ' + entry._id + ', owner public key = ' + publicKey + ', address = ' + address + ')');
            return false;
        }

        if (!await cryptoProvider.verify_complex(entry, proof.signature, signerPublicKey, address, proof.nonce, manifest.complexity)) {
            log?.warning('Update to collection containing entry with inadequate proof-of-work was ignored ' +
                '(entry id = ' + entry._id + ', owner public key = ' + publicKey + ', signer public key = ' + signerPublicKey + ', address = ' + address + ')');
            return false;
        }
    }

    // success!
    return true;
}