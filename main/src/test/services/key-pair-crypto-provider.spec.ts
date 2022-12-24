import { KeyPairCryptoProvider } from '../../library/services/key-pair-crypto-provider';
import { MockLocalStorage } from '../test_util/mock-local-storage';

const base64_regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{4}|[A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{2}={2})$/gm;

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

        expect(privateKey).toMatch(base64_regex);
    });

    it('generates a public key', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());

        // ---
        const publicKey = await crypto.publicKey();
        // ---

        expect(publicKey).toMatch(base64_regex);
    });

    it('generates a signature', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());

        // ---
        const signature = await crypto.sign({ key: 'value' });
        // ---

        expect(signature).toMatch(base64_regex);
    });

    it('generates a signature with complexity', async () => {
        const crypto = new KeyPairCryptoProvider(new MockLocalStorage());
        const prefix = 'pre';
        const complexity = 4;

        // ---
        const [signature, _] = await crypto.sign_complex({ key: 'value' }, prefix, complexity);
        // ---

        expect(KeyPairCryptoProvider.complexity(signature)).toBeGreaterThanOrEqual(complexity);
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

    it('verifies a signature with complexity', async () => {
        const crypto1 = new KeyPairCryptoProvider(new MockLocalStorage());
        const crypto2 = new KeyPairCryptoProvider(new MockLocalStorage());
        const obj = { key: 'value' };
        const prefix = 'pre';
        const complexity = 4;
        const [signature, nonce] = await crypto1.sign_complex(obj, prefix, complexity);

        // ---
        const valid = await crypto2.verify_complex(obj, signature, await crypto1.publicKey(), prefix, nonce, complexity);
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

    it('fails to verify a signature with inadequate complexity', async () => {
        const crypto1 = new KeyPairCryptoProvider(new MockLocalStorage());
        const crypto2 = new KeyPairCryptoProvider(new MockLocalStorage());
        const obj = { key: 'value' };
        const prefix = 'pre';
        const complexity = 4;
        const [signature, nonce] = await crypto1.sign_complex(obj, prefix, complexity);
        const required_complexity = 32;

        // ---
        const valid = await crypto2.verify_complex(obj, signature, await crypto1.publicKey(), prefix, nonce, required_complexity);
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
