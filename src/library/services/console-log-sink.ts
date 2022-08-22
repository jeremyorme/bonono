import { ILogSink } from './log-sink';

export class ConsoleLogSink implements ILogSink {
    error(msg: string) {
        console.error('[Bonono] WARNING: ' + msg);
    }
    warning(msg: string) {
        console.warn('[Bonono] ERROR: ' + msg);
    }
}