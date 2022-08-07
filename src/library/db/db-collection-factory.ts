import { ICollectionOptions } from "../private-data/collection-options";
import { IContentAccessor } from "../services/content-accessor";
import { ILocalStorage } from "../services/local-storage";
import { ICryptoProvider } from "../services/crypto-provider";
import { DbCollection, IDbCollection } from "./db-collection";
import { DbCollectionUpdater, IDbCollectionUpdater } from "./db-collection-updater";

export interface IDbCollectionFactory {
    createCollectionUpdater(
        contentAccessor: IContentAccessor,
        cryptoProvider: ICryptoProvider,
        localStorage: ILocalStorage,
        publish: (ICollection) => void,
        options: Partial<ICollectionOptions>): IDbCollectionUpdater;

    createCollection(updater: IDbCollectionUpdater): IDbCollection;
}

export class DbCollectionFactory implements IDbCollectionFactory {
    createCollectionUpdater(
        contentAccessor: IContentAccessor,
        cryptoProvider: ICryptoProvider,
        localStorage: ILocalStorage,
        publish: (ICollection) => void,
        options: Partial<ICollectionOptions>): IDbCollectionUpdater {
        return new DbCollectionUpdater(
            contentAccessor,
            cryptoProvider,
            localStorage,
            publish,
            options);
    }

    createCollection(updater: IDbCollectionUpdater): IDbCollection {
        return new DbCollection(updater);
    }
}