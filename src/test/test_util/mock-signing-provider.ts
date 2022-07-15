import { ISigningProvider } from "../../library/services/signing-provider";
import { cyrb53hex } from "./cyrb53";

/**
 * Mocks a signing provider in a totally insecure way for testing
 */
export class MockSigningProvider implements ISigningProvider {
    private _publicKey: string;

    constructor(private _id: string) {
        this._publicKey = cyrb53hex(this._id);
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

    async id(): Promise<string> {
        return this._id;
    }

    async publicKey(): Promise<string> {
        return this._publicKey;
    }
}