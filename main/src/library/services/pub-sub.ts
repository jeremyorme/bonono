export interface IPubSub {
    subscribe(channel: string, msgCallback: any, joinCallback: any): Promise<void>;
    publish(channel: string, message: string);
}