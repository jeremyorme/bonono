import { KeyPairCryptoProvider } from '../../library/services/key-pair-crypto-provider';
import { MockLocalStorage } from '../test_util/mock-local-storage';

describe('key-pair-crypto-provider', () => {
    it('constructs', () => {
        // ---
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());
        // ---

        expect(crypto).toBeTruthy();
    });

    it('generates a private key', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());

        // ---
        const privateKey = await crypto.privateKey();
        // ---

        expect(privateKey).toMatch(/^[A-HJ-NP-Za-km-z1-9]{43,44}$/);
    });

    it('generates a public key', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());

        // ---
        const publicKey = await crypto.publicKey();
        // ---

        expect(publicKey).toMatch(/^[A-HJ-NP-Za-km-z1-9]{43,44}$/);
    });

    it('generates a signature', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());

        // ---
        const signature = await crypto.sign({ key: 'value' });
        // ---

        expect(signature).toMatch(/^[A-HJ-NP-Za-km-z1-9]{87,88}$/);
    });

    it('verifies a signature', async () => {
        const crypto1 = new KeyPairCryptoProvider(new MockLocalStorage());
        const crypto2 = new KeyPairCryptoProvider(new MockLocalStorage());
        const obj = { key: 'value' };
        const signature = await crypto1.sign(obj);

        // ---
        const valid = await crypto2.verify(obj, signature, await crypto1.publicKey());
        // ---

        expect(valid).toBeTruthy();
    });

    it('fails to verify incorrect signature', async () => {
        const crypto1 = new KeyPairCryptoProvider(new MockLocalStorage());
        const crypto2 = new KeyPairCryptoProvider(new MockLocalStorage());
        const obj = { key: 'value' };
        const signature = await crypto1.sign(obj);

        // ---
        const valid = await crypto1.verify(obj, signature, await crypto2.publicKey());
        // ---

        expect(valid).toBeFalsy();
    });

    it('encrypts text', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());

        // ---
        const cipherText = await crypto.encrypt(JSON.stringify({ key: 'value' }));
        // ---

        expect(cipherText.length).toBeGreaterThan(0);
    });

    it('decrypts text', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());
        const plainTextIn = JSON.stringify({ key: 'value' });
        const cipherText = await crypto.encrypt(plainTextIn);

        // ---
        const plainTextOut = await crypto.decrypt(cipherText);
        // ---

        expect(plainTextOut).toEqual(plainTextIn);
    });
});
