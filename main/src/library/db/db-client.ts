import { CallbackContentAccessor } from '../services/callback-content-accessor';
import { CallbackPubSub } from '../services/callback-pub-sub';
import { ConsoleLogSink } from '../services/console-log-sink';
import { KeyPairCryptoProvider } from '../services/key-pair-crypto-provider';
import { LevelLocalStorage } from '../services/level-local-storage';
import { ILocalStorage } from '../services/local-storage';
import { Db, IDb } from './db';
import { DbCollectionFactory } from './db-collection-factory';

/**
 * Interface for creating/opening databases.
 */
export interface IDbClient {
    /**
     * Connect the DB client.
     * @remarks Must be called first to initialise the client
     * @returns A promise indicating whether connection succeeded
     */
    connect(): Promise<boolean>;

    /**
     * Close the DB client.
     * @returns A promise that resolves on completion
     */
    close(): Promise<void>;

    /**
     * Creates/opens a named database.
     * @param name Unique database name
     * @returns Database interface
     */
    db(name: string): Promise<IDb | null>;

    /**
     * Public key of the current user.
     * @remarks Returns own public key after successful call to connect, otherwise null
     * @returns Own public key string
     */
    publicKey(): string | null;
}

export class DbClient implements IDbClient {
    private _localStorage: ILocalStorage = new LevelLocalStorage('bonono');
    private _publicKey: string | null = null;

    constructor(
        private _peerId: string,
        private _publish: (channel: string, content: string) => void,
        private _subscribe: (channel: string) => void,
        private _addMessageListener: (listener: (channel: string, content: string) => void) => void,
        private _getObjectCb: (cid: string) => Promise<any>,
        private _putObjectCb: (obj: any) => Promise<string>) {
    }

    async connect(): Promise<boolean> {
        this._publicKey = await new KeyPairCryptoProvider(this._localStorage).publicKey();
        return true;
    }

    async close(): Promise<void> {
        this._publicKey = null;
    }

    async db(name: string): Promise<IDb | null> {
        return this._publicKey ? new Db(
            new CallbackContentAccessor(this._getObjectCb, this._putObjectCb),
            new CallbackPubSub(this._peerId, this._publish, this._subscribe, this._addMessageListener),
            new KeyPairCryptoProvider(this._localStorage),
            this._localStorage,
            new ConsoleLogSink(),
            new DbCollectionFactory(),
            name) : null;
    }

    publicKey(): string | null { return this._publicKey; }
}