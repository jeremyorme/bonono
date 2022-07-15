import { newSpecPage } from '@stencil/core/testing';
import { BononoDb } from './bonono-db';
import { h } from '@stencil/core';
import { DbClient } from '../../library/db/db-client';

describe('bonono-db', () => {
    it('renders', async () => {
        const { root } = await newSpecPage({
            components: [BononoDb],
            html: '<bonono-db></bonono-db>',
        });
        expect(root).toEqualHtml(`
      <bonono-db>
        <mock:shadow-root>
          <div>
            address: local
          </div>
        </mock:shadow-root>
      </bonono-db>
    `);
    });

    it('produces db client', async () => {
        let dbClient: DbClient = new DbClient('', null);

        await newSpecPage({
            components: [BononoDb],
            template: () => (<bonono-db onDbClient={ev => dbClient = ev.detail}></bonono-db>),
        });

        expect(dbClient.address()).toEqual('local');
    });
});
