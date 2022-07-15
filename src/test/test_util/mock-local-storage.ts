import { ILocalStorage } from "../../library/services/local-storage";

/**
 * Local storage for testing that puts/gets items in a map.
 */
export class MockLocalStorage implements ILocalStorage {
    private _store: Map<string, string> = new Map();

    getItem(key: string): string | null {
        return this._store.get(key) || null;
    }

    setItem(key: string, value: string) {
        this._store.set(key, value);
    }
}