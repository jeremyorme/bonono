import { IContentAccessor } from '../services/content-accessor';
import { IPubSub } from '../services/pub-sub';
import { ICollectionOptions } from '../private-data/collection-options';
import { ICollection } from '../public-data/collection';
import { IDbCollection } from './db-collection';
import { IDbCollectionUpdater } from './db-collection-updater';
import { ISigningProvider } from '../services/signing-provider';
import { ILocalStorage } from '../services/local-storage';
import { IDbCollectionFactory } from './db-collection-factory';

export class Db {
    private _collectionUpdaters: Map<string, IDbCollectionUpdater> = new Map();
    private _connected: boolean = false;
    private _identity: any = null;

    constructor(
        private _contentAccessor: IContentAccessor,
        private _pubsub: IPubSub,
        private _signingProvider: ISigningProvider,
        private _localStorage: ILocalStorage,
        private _dbCollectionFactory: IDbCollectionFactory,
        private _name: string) { }

    async collection(name: string, options: Partial<ICollectionOptions> = {}): Promise<IDbCollection> {

        const sub = collectionJson => {
            const collection: ICollection = JSON.parse(collectionJson.data) as ICollection;
            if (collection.senderIdentity == this._identity.id || !collection.address)
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
            this._contentAccessor, this._signingProvider, this._localStorage, pub, options);
        await collectionUpdater.init(this._name + '/' + name);
        this._collectionUpdaters.set(collectionUpdater.address(), collectionUpdater);

        return this._dbCollectionFactory.createCollection(collectionUpdater);
    }
}