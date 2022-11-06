import { IContentAccessor } from '../services/content-accessor';
import { IPubSub } from '../services/pub-sub';
import { ICollectionOptions } from '../private-data/collection-options';
import { ICollection } from '../public-data/collection';
import { IDbCollection } from './db-collection';
import { IDbCollectionUpdater } from './db-collection-updater';
import { ICryptoProvider } from '../services/crypto-provider';
import { ILocalStorage } from '../services/local-storage';
import { IDbCollectionFactory } from './db-collection-factory';
import { ILogSink } from '../services/log-sink';

/**
 * Provides access to a named database.
 */
export interface IDb {
    /**
     * Creates/opens a named collection.
     * @param name Collection name
     * @returns Promise resolving to a collection interface
     */
    collection(name: string): Promise<IDbCollection>;

    /**
     * Creates/opens a named collection with the specified options.
     * @param name Collection name
     * @param options Collection options
     * @returns Promise resolving to a collection interface
     */
    collection(name: string, options: Partial<ICollectionOptions>): Promise<IDbCollection>;
}

export class Db implements IDb {
    private _collectionUpdaters: Map<string, IDbCollectionUpdater> = new Map();
    private _connected: boolean = false;

    constructor(
        private _contentAccessor: IContentAccessor,
        private _pubsub: IPubSub,
        private _cryptoProvider: ICryptoProvider,
        private _localStorage: ILocalStorage,
        private _log: ILogSink,
        private _dbCollectionFactory: IDbCollectionFactory,
        private _name: string) { }

    async collection(name: string, options: Partial<ICollectionOptions> = {}): Promise<IDbCollection> {

        const _selfPublicKey = await this._cryptoProvider.publicKey();

        const sub = collectionJson => {
            const collection: ICollection = JSON.parse(collectionJson.data) as ICollection;
            if (collection.senderPublicKey == _selfPublicKey || !collection.address)
                return;
            const updater = this._collectionUpdaters.get(collection.address);
            if (updater)
                updater.merge(collection);
        };

        if (!this._connected) {
            const join = peer => {
                for (const collectionUpdater of this._collectionUpdaters.values())
                    collectionUpdater.onPeerJoined(peer);
            }
            await this._pubsub.subscribe('/db/' + this._name, sub, join);
            this._connected = true;
        }

        const pub = (collection: ICollection) => {
            const collectionJson = JSON.stringify(collection)
            this._pubsub.publish('/db/' + this._name, collectionJson);
        };

        const collectionUpdater = this._dbCollectionFactory.createCollectionUpdater(
            this._contentAccessor, this._cryptoProvider, this._localStorage, this._log, pub, options);
        await collectionUpdater.init(this._name + '/' + name);
        this._collectionUpdaters.set(collectionUpdater.address(), collectionUpdater);

        return this._dbCollectionFactory.createCollection(collectionUpdater);
    }
}
