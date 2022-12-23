import { ConsoleLogSink } from '../services/console-log-sink';
import { IpfsContentAccessor } from '../services/ipfs-content-accessor';
import { IpfsPubSub } from '../services/ipfs-pub-sub';
import { KeyPairCryptoProvider } from '../services/key-pair-crypto-provider';
import { LevelLocalStorage } from '../services/level-local-storage';
import { ILocalStorage } from '../services/local-storage';
import { Db, IDb } from './db';
import { DbCollectionFactory } from './db-collection-factory';
import { base58_to_binary } from 'base58-js';
import { fromByteArray } from 'base64-js';

/**
 * Handles the connection to IPFS and opening databases.
 */
export interface IDbClient {
    /**
     * Connect to IPFS.
     * @returns A promise indicating whether connection succeeded
     */
    connect(): Promise<boolean>;

    /**
     * Close the IPFS connection.
     * @returns A promise that resolves on completion
     */
    close(): Promise<void>;

    /**
     * Opens a named database.
     * @param name Unique database name
     * @returns Database interface
     */
    db(name: string): Promise<IDb | null>;

    /**
     * Address for connecting to IPFS.
     * @returns The address
     */
    address(): string;

    /**
     * Public key of the current user.
     * @remarks Returns own public key after successful call to connect, otherwise null
     * @returns Own public key string
     */
    publicKey(): string | null;
}

export class DbClient implements IDbClient {
    private _localStorage: ILocalStorage;
    private _publicKey: string | null = null;

    constructor(
        private _address: string,
        private _window: any) {
        this._localStorage = new LevelLocalStorage('bonono');
    }

    async connect(): Promise<boolean> {
        if (!this._window || !this._window['Ipfs']) {
            console.error('Unable to locate IPFS');
            return false;
        }

        const isLocal = !this._address || this._address == "local";
        const swarmAddrs = isLocal ? [] : this._address.split(';');
        if (this._window['_ipfs'])
            return true;

        const crypto = new KeyPairCryptoProvider(this._localStorage);
        this._publicKey = await crypto.publicKey();

        this._window['_ipfs'] = await this._window['Ipfs'].create({
            init: { privateKey: fromByteArray(base58_to_binary(await crypto.privateKey())) },
            preload: { enabled: false },
            EXPERIMENTAL: { pubsub: true },
            config: {
                Addresses: { Swarm: swarmAddrs },
            }
        });
        return !!this._window['_ipfs'];
    }

    async close(): Promise<void> {
        if (this._window['_ipfs']) {
            await this._window['_ipfs'].stop();
            delete this._window['_ipfs'];
        }
    }

    async db(name: string): Promise<IDb | null> {
        const ipfs = this._window['_ipfs'];
        return ipfs ?
            new Db(
                new IpfsContentAccessor(ipfs, 10000),
                new IpfsPubSub(ipfs),
                new KeyPairCryptoProvider(this._localStorage),
                this._localStorage,
                new ConsoleLogSink(),
                new DbCollectionFactory(),
                name) : null;
    }

    address(): string { return this._address; }

    publicKey(): string | null { return this._publicKey; }
}