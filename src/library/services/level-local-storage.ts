import { ILocalStorage } from './local-storage';
import { Level } from 'level';

export class LevelLocalStorage implements ILocalStorage {
    private _db: Level;

    constructor(name: string) {
        this._db = new Level(name);
    }

    async getItem(key: string): Promise<string | null> {
        try {
            const result = await this._db.get(key);
            return result;
        }
        catch
        {
            return null;
        }
    }

    async setItem(key: string, value: string): Promise<boolean> {
        try {
            await this._db.put(key, value);
            return true;
        }
        catch
        {
            return false;
        }
    }
}