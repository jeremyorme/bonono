import { ISigningProvider } from "./signing-provider";
import * as ed from '@noble/ed25519';
import { binary_to_base58, base58_to_binary } from 'base58-js';
import { ILocalStorage } from "./local-storage";

function stringToHex(str: string): string {
    const encoder = new TextEncoder();
    const objBytes = encoder.encode(str);
    return ed.utils.bytesToHex(objBytes);
}

export class KeyPairSigningProvider implements ISigningProvider {

    private _privateKey: string;
    private _privateKeyHex: string;
    private _publicKey: string;

    constructor(localStorage: ILocalStorage) {
        let privateKey = localStorage.getItem('private-key');
        if (privateKey) {
            this._privateKey = privateKey;
        }
        else {
            this._privateKey = binary_to_base58(ed.utils.randomPrivateKey());
            localStorage.setItem('private-key', this._privateKey);
        }
        this._privateKeyHex = ed.utils.bytesToHex(base58_to_binary(this._privateKey));
    }

    async sign(obj: any): Promise<string> {
        return binary_to_base58(await ed.sign(stringToHex(JSON.stringify(obj)), this._privateKeyHex));
    }

    async verify(obj: any, signature: string, publicKey: string): Promise<boolean> {
        const signatureHex = ed.utils.bytesToHex(base58_to_binary(signature));
        const publicKeyHex = ed.utils.bytesToHex(base58_to_binary(publicKey));
        return ed.verify(ed.Signature.fromHex(signatureHex), stringToHex(JSON.stringify(obj)), publicKeyHex);
    }

    async id(): Promise<string> {
        const publicKeyHex = ed.utils.bytesToHex(base58_to_binary(await this.publicKey()));
        return binary_to_base58(await ed.sign(this._privateKeyHex, publicKeyHex));
    }

    privateKey(): string {
        return this._privateKey;
    }

    async publicKey(): Promise<string> {
        if (!this._publicKey)
            this._publicKey = binary_to_base58(await ed.getPublicKey(this._privateKeyHex));

        return this._publicKey;
    }
}