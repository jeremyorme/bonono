import { newE2EPage } from '@stencil/core/testing';

describe('bonono-db', () => {
    it('renders', async () => {
        jest.setTimeout(100000);
        const page = await newE2EPage();

        await page.setContent('<bonono-db></bonono-db>');
        const element = await page.find('bonono-db >>> div');
        expect(element.textContent).toEqual(`address: local`);
    });
});
