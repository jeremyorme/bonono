import { DbCollectionUpdater } from "../../../library/db/db-collection-updater";
import { defaultCollectionOptions } from "../../../library/private-data/collection-options";
import { MockContentStorage } from "../../test_util/mock-content-storage";
import { MockCryptoProvider } from "../../test_util/mock-crypto-provider";
import { MockLocalStorage } from "../../test_util/mock-local-storage";

describe('db-collection-updater constructor', () => {
    it('constructs', () => {
        // ---
        const updater: DbCollectionUpdater = new DbCollectionUpdater(
            new MockContentStorage(), new MockCryptoProvider('test-id'), new MockLocalStorage(),
            null, _ => { }, _ => { }, defaultCollectionOptions);
        // ---

        // Check the constructed updater is valid
        expect(updater).toBeTruthy();
        expect(updater.address()).toBeFalsy();
    });
});