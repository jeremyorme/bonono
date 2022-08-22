import { ILogSink } from '../../library/services/log-sink';

export class MockLogSink implements ILogSink {
    errors: string[] = [];
    warnings: string[] = [];

    error(msg: string) {
        this.errors.push(msg);
    }
    warning(msg: string) {
        this.warnings.push(msg);
    }
}