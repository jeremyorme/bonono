import { DbCollectionUpdater, IDbCollectionUpdater } from "../../library/db/db-collection-updater";
import { ICollectionOptions } from "../../library/private-data/collection-options";
import { ICollection } from "../../library/public-data/collection";
import { entryByClock } from "../../library/util/sort-comparators";
import { MockContentStorage } from "./mock-content-storage";
import { MockCryptoProvider } from "./mock-crypto-provider";
import { MockLocalStorage } from "./mock-local-storage";
import { MockLogSink } from "./mock-log-sink";

// Helper to set up a basic test environment for DbCollectionUpdater
// using mocked services and providing two updaters:
//   updaterOwn - To simulate updates by the current user
//   updaterOther - To simulate updates by some other user
export class UpdaterTestEnv {
    name: string = 'test-collection';
    content: MockContentStorage = new MockContentStorage();
    cryptoOwn: MockCryptoProvider = new MockCryptoProvider('own-id');
    cryptoOther: MockCryptoProvider = new MockCryptoProvider('other-id');
    localStorage: MockLocalStorage = new MockLocalStorage();
    logSink: MockLogSink = new MockLogSink();
    published: ICollection[] = [];
    closed: string[] = [];
    updaterOwn: IDbCollectionUpdater;
    updaterOther: IDbCollectionUpdater;
    publicKeyOwn: string = '';
    publicKeyOther: string = '';
    updatesOwn: any[][] = [];
    updatesOther: any[][] = [];

    createOther(opts: Partial<ICollectionOptions> = {}) {
        // Create other updater
        this.updaterOther = new DbCollectionUpdater(
            this.content,
            this.cryptoOther,
            this.localStorage,
            this.logSink,
            col => { this.published.push(col); },
            addr => { this.closed.push(addr) },
            opts);
    }

    async initOther() {
        // Init other
        await this.updaterOther.init(this.name);
        this.publicKeyOther = await this.cryptoOther.publicKey();
        this.updaterOther.onUpdated(() => {
            this.updatesOther.push([...this.updaterOther.index().values()].sort(entryByClock));
        });
    }

    createOwn(opts: Partial<ICollectionOptions> = {}) {
        // Then create own updater (using crypto based on different id)
        this.updaterOwn = new DbCollectionUpdater(
            this.content,
            this.cryptoOwn,
            this.localStorage,
            this.logSink,
            col => { this.published.push(col); },
            addr => { this.closed.push(addr) },
            opts);
    }

    async initOwn() {
        // Init own
        await this.updaterOwn.init(this.name);
        this.publicKeyOwn = await this.cryptoOwn.publicKey();
        this.updaterOwn.onUpdated(() => {
            this.updatesOwn.push([...this.updaterOwn.index().values()].sort(entryByClock));
        });
    }
}