import { IPubSub } from "../../library/services/pub-sub";

class Subscriber {
    constructor(private _msgCallback: any, private _joinCallback: any) { }

    notifyMessage(msg: string) {
        this._msgCallback(msg);
    }

    notifyJoin(peer: string) {
        this._joinCallback(peer);
    }
}

class Channel {
    private _subscribers: Subscriber[] = [];

    subscribe(peer: string, msgCallback: any, joinCallback: any) {
        this._subscribers.forEach(sub => sub.notifyJoin(peer));
        this._subscribers.push(new Subscriber(msgCallback, joinCallback));
    }

    publish(message: string) {
        this._subscribers.forEach(sub => sub.notifyMessage(message));
    }
}

/**
 * Pub sub for testing that implements local pub-sub
 */
export class MockPubSub implements IPubSub {
    private _channels: Map<string, Channel> = new Map();

    constructor(private _id: string) { }

    async subscribe(channel: string, msgCallback: any, joinCallback: any): Promise<void> {
        let c = this._channels.get(channel);
        if (!c) {
            c = new Channel();
            this._channels.set(channel, c);
        }
        c.subscribe(this._id, msgCallback, joinCallback);
    }
    publish(channel: string, message: string) {
        let c = this._channels.get(channel);
        if (c)
            c.publish(message);
    }
}