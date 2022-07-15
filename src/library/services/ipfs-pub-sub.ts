import IpfsPubsubPeerMonitor from 'ipfs-pubsub-peer-monitor';
import { IPubSub } from "./pub-sub";

export class IpfsPubSub implements IPubSub {
    private _monitor: any;

    constructor(private _ipfs: any) { }

    async subscribe(channel: string, msgCallback: any, joinCallback: any): Promise<void> {
        await this._ipfs.pubsub.subscribe(channel, msgCallback);
        this._monitor = new IpfsPubsubPeerMonitor(this._ipfs.pubsub, channel)
        this._monitor.on('join', joinCallback);
    }

    publish(channel: string, message: string) {
        this._ipfs.pubsub.publish(channel, message);
    }
}