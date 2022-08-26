import { ILocalStorage } from "../../library/services/local-storage";

/**
 * Local storage for testing that puts/gets items in a map.
 */
export class MockLocalStorage implements ILocalStorage {
    private _store: Map<string, string> = new Map();

    async getItem(key: string): Promise<string | null> {
        return this._store.get(key) || null;
    }

    async setItem(key: string, value: string): Promise<boolean> {
        this._store.set(key, value);
        return false;
    }
}