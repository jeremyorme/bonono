import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';
import { DbClient, IDbClient } from '../../library/db/db-client';

@Component({
    tag: 'bonono-db',
    styleUrl: 'bonono-db.css',
    shadow: true,
})
export class BononoDb {
    /**
     * Server address
     */
    @Prop() address: string = 'local';

    /**
     * Produces DbClient
     */
    @Event() dbClient: EventEmitter<IDbClient>;

    componentDidLoad() {
        this.dbClient.emit(new DbClient(this.address, window));
    }

    render() {
        return <div>address: {this.address}</div>;
    }
}