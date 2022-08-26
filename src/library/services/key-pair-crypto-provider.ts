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

export class KeyPairCryptoProvider implements ICryptoProvider {

    private _privateKey: string;
    private _privateKeyHex: string;
    private _publicKey: string;
    private _passPhrase: string;

    constructor(private _localStorage: ILocalStorage) { }

    async sign(obj: any): Promise<string> {
        return binary_to_base58(await ed.sign(stringToHex(JSON.stringify(obj)), await this.privateKeyHex()));
    }

    async verify(obj: any, signature: string, publicKey: string): Promise<boolean> {
        const signatureHex = ed.utils.bytesToHex(base58_to_binary(signature));
        const publicKeyHex = ed.utils.bytesToHex(base58_to_binary(publicKey));
        return ed.verify(ed.Signature.fromHex(signatureHex), stringToHex(JSON.stringify(obj)), publicKeyHex);
    }

    async id(): Promise<string> {
        const publicKeyHex = ed.utils.bytesToHex(base58_to_binary(await this.publicKey()));
        return binary_to_base58(await ed.sign(await this.privateKeyHex(), publicKeyHex));
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