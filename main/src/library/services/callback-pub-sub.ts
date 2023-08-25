import { IPubSub } from "./pub-sub";

export class CallbackPubSub implements IPubSub {
    constructor(
        private _peerId: string,
        private _publish: (channel: string, content: string) => void,
        private _subscribe: (channel: string) => void,
        private _addMessageListener: (listener: (channel: string, content: string) => void) => void) {
    }

    async subscribe(channel: string, msgCallback: any, joinCallback: any): Promise<void> {
        const joinerChannel = channel + '-join';
        this._addMessageListener((msgChan: string, content: string) => {
            if (msgChan === channel)
                msgCallback(content);
            else if (msgChan === joinerChannel)
                joinCallback(content);
        });
        this._subscribe(channel);
        this._subscribe(joinerChannel);
        this._publish(joinerChannel, this._peerId);
    }

    publish(channel: string, message: string) {
        this._publish(channel, message);
    }
}