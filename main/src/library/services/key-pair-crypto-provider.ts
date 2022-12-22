import { ICryptoProvider } from "./crypto-provider";
import * as ed from '@noble/ed25519';
import { binary_to_base58, base58_to_binary } from 'base58-js';
import { ILocalStorage } from "./local-storage";
import * as CryptoJS from 'crypto-js';

function stringToHex(str: string): string {
    const encoder = new TextEncoder();
    const objBytes = encoder.encode(str);
    return ed.utils.bytesToHex(objBytes);
}

function numLeadingZeroBits(bytes: Uint8Array) {
    let leadingZeroBits = 0;
    let i = 0;
    for (; i < bytes.length && bytes[i] == 0; ++i, leadingZeroBits += 8) { }
    for (let j = 0; j < 8 && (bytes[i] & (0x80 >> j)) == 0; ++j, ++leadingZeroBits) { }
    return leadingZeroBits;
}

export class KeyPairCryptoProvider implements ICryptoProvider {

    private _privateKey: string;
    private _privateKeyHex: string;
    private _publicKey: string;
    private _passPhrase: string;

    constructor(private _localStorage: ILocalStorage) { }

    static complexity(signature: string): number {
        const sigBytes: Uint8Array = base58_to_binary(signature);
        return numLeadingZeroBits(sigBytes);
    }

    async sign(obj: any): Promise<string> {
        return binary_to_base58(await ed.sign(stringToHex(JSON.stringify(obj)), await this.privateKeyHex()));
    }

    async sign_complex(obj: any, prefix: string, complexity: number): Promise<[string, string]> {
        var sigBytes: Uint8Array, nonce: string;
        do {
            nonce = binary_to_base58(ed.utils.randomBytes(32));
            sigBytes = await ed.sign(stringToHex(JSON.stringify({ prefix, obj, nonce })), await this.privateKeyHex());
        } while (numLeadingZeroBits(sigBytes) < complexity);

        return [binary_to_base58(sigBytes), nonce];
    }

    async verify(obj: any, signature: string, publicKey: string): Promise<boolean> {
        const signatureHex = ed.utils.bytesToHex(base58_to_binary(signature));
        const publicKeyHex = ed.utils.bytesToHex(base58_to_binary(publicKey));
        return ed.verify(ed.Signature.fromHex(signatureHex), stringToHex(JSON.stringify(obj)), publicKeyHex);
    }

    async verify_complex(obj: any, signature: string, publicKey: string, prefix: string, nonce: string, complexity: number): Promise<boolean> {
        const sigBytes: Uint8Array = base58_to_binary(signature);
        if (numLeadingZeroBits(sigBytes) < complexity)
            return false;
        const signatureHex = ed.utils.bytesToHex(sigBytes);
        const publicKeyHex = ed.utils.bytesToHex(base58_to_binary(publicKey));
        return ed.verify(ed.Signature.fromHex(signatureHex), stringToHex(JSON.stringify({ prefix, obj, nonce })), publicKeyHex);
    }

    async privateKey(): Promise<string> {
        if (!this._privateKey) {
            let privateKey = await this._localStorage.getItem('private-key');
            if (privateKey) {
                this._privateKey = privateKey;
            }
            else {
                this._privateKey = binary_to_base58(ed.utils.randomPrivateKey());
                await this._localStorage.setItem('private-key', this._privateKey);
            }
        }
        return this._privateKey;
    }

    async publicKey(): Promise<string> {
        if (!this._publicKey)
            this._publicKey = binary_to_base58(await ed.getPublicKey(await this.privateKeyHex()));

        return this._publicKey;
    }

    async encrypt(plainText: string): Promise<string> {
        return CryptoJS.AES.encrypt(CryptoJS.enc.Latin1.parse(plainText), await this.generatePassPhrase()).toString();
    }

    async decrypt(cipherText: string): Promise<string> {
        return CryptoJS.enc.Latin1.stringify(CryptoJS.AES.decrypt(cipherText, await this.generatePassPhrase()));
    }

    private async privateKeyHex(): Promise<string> {
        if (!this._privateKeyHex) {
            this._privateKeyHex = ed.utils.bytesToHex(base58_to_binary(await this.privateKey()));
        }
        return this._privateKeyHex;
    }

    private async generatePassPhrase(): Promise<string> {
        if (!this._passPhrase) {
            const publicKeyHex = ed.utils.bytesToHex(base58_to_binary(await this.publicKey()));
            this._passPhrase = await binary_to_base58(await ed.getSharedSecret(await this.privateKeyHex(), publicKeyHex));
        }
        return this._passPhrase;
    }
}