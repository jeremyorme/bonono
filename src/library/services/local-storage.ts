export interface ILocalStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<boolean>;
}