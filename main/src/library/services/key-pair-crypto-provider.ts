import { ICryptoProvider } from "./crypto-provider";
import { ILocalStorage } from "./local-storage";
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/curves/abstract/utils';
import { aes_encrypt, aes_decrypt } from '@noble/ciphers/simple';
import { utf8ToBytes, bytesToUtf8 } from "@noble/ciphers/utils";
import { randomBytes } from '@noble/hashes/utils';
import * as Base64 from 'base64-js';

function stringToHex(str: string): string {
    const encoder = new TextEncoder();
    const objBytes = encoder.encode(str);
    return bytesToHex(objBytes);
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
        const sigBytes: Uint8Array = Base64.toByteArray(signature);
        return numLeadingZeroBits(sigBytes);
    }

    async sign(obj: any): Promise<string> {
        const objHex = stringToHex(JSON.stringify(obj));
        const privateKeyHex = bytesToHex(Base64.toByteArray(await this.privateKey()));
        return Base64.fromByteArray(ed25519.sign(objHex, privateKeyHex));
    }

    async sign_complex(obj: any, prefix: string, complexity: number): Promise<[string, string]> {
        var sigBytes: Uint8Array, nonce: string;
        const privateKeyHex = bytesToHex(Base64.toByteArray(await this.privateKey()));
        do {
            nonce = Base64.fromByteArray(randomBytes(32));
            const objHex = stringToHex(JSON.stringify({ prefix, obj, nonce }));
            sigBytes = ed25519.sign(objHex, privateKeyHex);
        } while (numLeadingZeroBits(sigBytes) < complexity);

        return [Base64.fromByteArray(sigBytes), nonce];
    }

    async verify(obj: any, signature: string, publicKey: string): Promise<boolean> {
        const sigHex = bytesToHex(Base64.toByteArray(signature));
        const objHex = stringToHex(JSON.stringify(obj));
        const publicKeyHex = bytesToHex(Base64.toByteArray(publicKey));
        return ed25519.verify(sigHex, objHex, publicKeyHex);
    }

    async verify_complex(obj: any, signature: string, publicKey: string, prefix: string, nonce: string, complexity: number): Promise<boolean> {
        const sigBytes: Uint8Array = Base64.toByteArray(signature);
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
                const privateKeyBytes = ed25519.utils.randomPrivateKey();
                this._privateKey = Base64.fromByteArray(privateKeyBytes);
                await this._localStorage.setItem('private-key-ed25519', this._privateKey);
            }
        }
        return this._privateKey;
    }

    async publicKey(): Promise<string> {
        if (!this._publicKey) {
            const privateKeyHex = bytesToHex(Base64.toByteArray(await this.privateKey()));
            this._publicKey = Base64.fromByteArray(ed25519.getPublicKey(privateKeyHex));
        }

        return this._publicKey;
    }

    async encrypt(plainText: string): Promise<string> {
        return Base64.fromByteArray(await aes_encrypt(Base64.toByteArray(await this.privateKey()), utf8ToBytes(plainText)));
    }

    async decrypt(cipherText: string): Promise<string> {
        return bytesToUtf8(await aes_decrypt(Base64.toByteArray(await this.privateKey()), Base64.toByteArray(cipherText)));
    }
}