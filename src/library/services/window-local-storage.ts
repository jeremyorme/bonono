import { ILocalStorage } from "./local-storage";

export class WindowLocalStorage implements ILocalStorage {
    getItem(key: string): string | null {
        return window.localStorage.getItem(key);
    }
    setItem(key: string, value: string) {
        window.localStorage.setItem(key, value);
    }
}