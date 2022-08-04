import { IpfsContentAccessor } from '../services/ipfs-content-accessor';
import { IpfsPubSub } from '../services/ipfs-pub-sub';
import { KeyPairSigningProvider } from '../services/key-pair-signing-provider';
import { ILocalStorage } from '../services/local-storage';
import { WindowLocalStorage } from '../services/window-local-storage';
import { Db } from './db';
import { DbCollectionFactory } from './db-collection-factory';

/**
 * Manages connection and opening databases
 */
export class DbClient {
    private _localStorage: ILocalStorage;

    constructor(
        private _address: string,
        private _window: any) {
        this._localStorage = new WindowLocalStorage();
    }

    async connect() {
        if (!this._window || !this._window['Ipfs']) {
            console.error('Unable to locate IPFS');
            return;
        }

        const isLocal = !this._address || this._address == "local";
        const swarmAddrs = isLocal ? [] : this._address.split(';');
        if (!this._window['_ipfs']) {
            this._window['_ipfs'] = await this._window['Ipfs'].create({
                init: { privateKey: new KeyPairSigningProvider(this._localStorage).privateKey() },
                preload: { enabled: false },
                EXPERIMENTAL: { pubsub: true },
                config: {
                    Addresses: { Swarm: swarmAddrs },
                }
            });
        }
    }

    async close() {
        if (this._window['_ipfs']) {
            await this._window['_ipfs'].stop();
            delete this._window['_ipfs'];
        }
    }

    async db(name: string): Promise<Db | null> {
        const ipfs = this._window['_ipfs'];
        return ipfs ?
            new Db(
                new IpfsContentAccessor(ipfs, 10000),
                new IpfsPubSub(ipfs),
                new KeyPairSigningProvider(this._localStorage),
                this._localStorage,
                new DbCollectionFactory(),
                name) : null;
    }

    address(): string { return this._address; }
}