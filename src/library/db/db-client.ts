import { IpfsContentAccessor } from '../services/ipfs-content-accessor';
import { IpfsPubSub } from '../services/ipfs-pub-sub';
import { OrbitDbSigningProvider } from '../services/orbitdb-signing-provider';
import { WindowLocalStorage } from '../services/window-local-storage';
import { Db } from './db';
import { DbCollectionFactory } from './db-collection-factory';

/**
 * Manages connection and opening databases
 */
export class DbClient {
    constructor(
        private _address: string,
        private _window: any) { }

    async connect() {
        if (!this._window) {
            console.error('Unable to locate window');
        }
        else if (!this._window['Ipfs']) {
            console.error('Unable to locate IPFS');
        }
        else if (!this._window['OrbitDB']) {
            console.error('Unable to locate OrbitDB');
        }
        else {
            const isLocal = !this._address || this._address == "local";
            const swarmAddrs = isLocal ? [] : this._address.split(';');
            if (!this._window['_ipfs']) {
                this._window['_ipfs'] = await this._window['Ipfs'].create({
                    preload: { enabled: false },
                    EXPERIMENTAL: { pubsub: true },
                    config: {
                        Addresses: { Swarm: swarmAddrs },
                    }
                });
            }
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
                new OrbitDbSigningProvider(ipfs, this._window['OrbitDB']),
                new WindowLocalStorage(),
                new DbCollectionFactory(),
                name) : null;
    }

    address(): string { return this._address; }
}