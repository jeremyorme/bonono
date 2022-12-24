import { ICryptoProvider } from "./crypto-provider";
import { binary_to_base58, base58_to_binary } from 'base58-js';
import { ILocalStorage } from "./local-storage";
import * as CryptoJS from 'crypto-js';
import { keys, randomBytes } from 'libp2p-crypto';

function stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
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
    private _publicKey: string;

    constructor(private _localStorage: ILocalStorage) { }

    static complexity(signature: string): number {
        const sigBytes: Uint8Array = base58_to_binary(signature);
        return numLeadingZeroBits(sigBytes);
    }

    async sign(obj: any): Promise<string> {
        const privateKeyObj = await keys.unmarshalPrivateKey(base58_to_binary(await this.privateKey()));
        return binary_to_base58(await privateKeyObj.sign(stringToBytes(JSON.stringify(obj))));
    }

    async sign_complex(obj: any, prefix: string, complexity: number): Promise<[string, string]> {
        var sigBytes: Uint8Array, nonce: string;
        const privateKeyObj = await keys.unmarshalPrivateKey(base58_to_binary(await this.privateKey()));
        do {
            nonce = binary_to_base58(randomBytes(32));
            sigBytes = await privateKeyObj.sign(stringToBytes(JSON.stringify({ prefix, obj, nonce })));
        } while (numLeadingZeroBits(sigBytes) < complexity);

        return [binary_to_base58(sigBytes), nonce];
    }

    async verify(obj: any, signature: string, publicKey: string): Promise<boolean> {
        const publicKeyObj = await keys.unmarshalPublicKey(base58_to_binary(publicKey));
        return publicKeyObj.verify(stringToBytes(JSON.stringify(obj)), base58_to_binary(signature));
    }

    async verify_complex(obj: any, signature: string, publicKey: string, prefix: string, nonce: string, complexity: number): Promise<boolean> {
        const sigBytes: Uint8Array = base58_to_binary(signature);
        if (numLeadingZeroBits(sigBytes) < complexity)
            return false;

        return this.verify({ prefix, obj, nonce }, signature, publicKey);
    }

    async privateKey(): Promise<string> {
        if (!this._privateKey) {
            let privateKey = await this._localStorage.getItem('private-key-ed25519');
            if (privateKey) {
                this._privateKey = privateKey;
            }
            else {
                const privateKeyObj = await keys.generateKeyPair('Ed25519');
                this._privateKey = binary_to_base58(keys.marshalPrivateKey(privateKeyObj));
                await this._localStorage.setItem('private-key-ed25519', this._privateKey);
            }
        }
        return this._privateKey;
    }

    async publicKey(): Promise<string> {
        if (!this._publicKey) {
            const privateKeyObj = await keys.unmarshalPrivateKey(base58_to_binary(await this.privateKey()));
            this._publicKey = binary_to_base58(keys.marshalPublicKey(privateKeyObj.public));
        }

        return this._publicKey;
    }

    async encrypt(plainText: string): Promise<string> {
        return CryptoJS.AES.encrypt(CryptoJS.enc.Latin1.parse(plainText), await this.privateKey()).toString();
    }

    async decrypt(cipherText: string): Promise<string> {
        return CryptoJS.enc.Latin1.stringify(CryptoJS.AES.decrypt(cipherText, await this.privateKey()));
    }
}