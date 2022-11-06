import { ICryptoProvider } from "../../library/services/crypto-provider";
import { cyrb53hex } from "./cyrb53";

/**
 * Mocks a crypto provider in a totally insecure way for testing
 */
export class MockCryptoProvider implements ICryptoProvider {
    private _publicKey: string;

    constructor(id: string) {
        this._publicKey = cyrb53hex(id);
    }

    async sign(obj: any): Promise<string> {
        const objHash = cyrb53hex(JSON.stringify(obj));
        const objSignature = objHash + '-' + this._publicKey;
        return objSignature;
    }

    async verify(obj: any, signature: string, publicKey: string): Promise<boolean> {
        const objHash = cyrb53hex(JSON.stringify(obj));
        const objSignature = objHash + '-' + publicKey;
        return signature == objSignature;
    }

    async publicKey(): Promise<string> {
        return this._publicKey;
    }

    async encrypt(plainText: string): Promise<string> {
        return plainText.split('').reverse().join('');
    }

    async decrypt(cipherText: string): Promise<string> {
        return cipherText.split('').reverse().join('');
    }
}