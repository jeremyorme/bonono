import { IContentAccessor } from "../../library/services/content-accessor";
import { cyrb53hex } from "./cyrb53";

/**
 * Content accessor for testing that puts/gets items in a map.
 */
export class MockContentStorage implements IContentAccessor {
    private objs_: Map<string, string> = new Map();

    async getObject<T>(cid: string): Promise<T | null> {
        const json = this.objs_.get(cid);
        return json ? JSON.parse(json) as T : null;
    }

    async putObject<T>(obj: T): Promise<string> {
        const json = JSON.stringify(obj);
        const cid = cyrb53hex(json);
        this.objs_.set(cid, json);
        return cid;
    }
}