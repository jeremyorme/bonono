import { ISigningProvider } from "./signing-provider";

export class OrbitDbSigningProvider implements ISigningProvider {
    private _identity: any = null;

    constructor(private _ipfs: any, private _orbitDbClass: any) { }

    async identity(): Promise<any> {
        if (!this._identity) {
            const ipfsId = await this._ipfs.id();
            const store = await this._orbitDbClass.Storage(null, {}).createStore('./orbitdb/' + ipfsId.id + '/keystore');
            const keystore = new this._orbitDbClass.Keystore(store);
            this._identity = await this._orbitDbClass.Identities.createIdentity({ id: ipfsId.id, keystore });
        }
        return this._identity;
    }

    async sign(obj: any): Promise<string> {
        const identity = await this.identity();
        return identity.provider.sign(this._identity, JSON.stringify(obj));
    }

    async verify(obj: any, signature: string, publicKey: string): Promise<boolean> {
        const identity = await this.identity();
        return identity.provider.verify(
            signature, publicKey, JSON.stringify(obj), 'v1');
    }

    async id(): Promise<string> {
        const identity = await this.identity();
        return identity.id;
    }

    async publicKey(): Promise<string> {
        const identity = await this.identity();
        return identity.publicKey;
    }
}