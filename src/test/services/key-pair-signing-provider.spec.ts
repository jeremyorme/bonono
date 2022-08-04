import { KeyPairSigningProvider } from "../../library/services/key-pair-signing-provider";
import { MockLocalStorage } from "../test_util/mock-local-storage";

describe('key-pair-signing-provider', () => {
    it('constructs', () => {
        // ---
        const signing = new KeyPairSigningProvider(new MockLocalStorage());
        // ---

        expect(signing).toBeTruthy();
    });

    it('generates a private key', () => {
        const signing = new KeyPairSigningProvider(new MockLocalStorage());

        // ---
        const privateKey = signing.privateKey();
        // ---

        expect(privateKey).toMatch(/^[A-HJ-NP-Za-km-z1-9]{44}$/);
    });

    it('generates a public key', async () => {
        const signing = new KeyPairSigningProvider(new MockLocalStorage());

        // ---
        const publicKey = await signing.publicKey();
        // ---

        expect(publicKey).toMatch(/^[A-HJ-NP-Za-km-z1-9]{44}$/);
    });

    it('generates an id', async () => {
        const signing = new KeyPairSigningProvider(new MockLocalStorage());

        // ---
        const publicKey = await signing.id();
        // ---

        expect(publicKey).toMatch(/^[A-HJ-NP-Za-km-z1-9]{87,88}$/);
    });

    it('generates a signature', async () => {
        const signing = new KeyPairSigningProvider(new MockLocalStorage());

        // ---
        const signature = await signing.sign({ key: 'value' });
        // ---

        expect(signature).toMatch(/^[A-HJ-NP-Za-km-z1-9]{87,88}$/);
    });

    it('verifies a signature', async () => {
        const signing1 = new KeyPairSigningProvider(new MockLocalStorage());
        const signing2 = new KeyPairSigningProvider(new MockLocalStorage());
        const obj = { key: 'value' };
        const signature = await signing1.sign(obj);

        // ---
        const valid = await signing2.verify(obj, signature, await signing1.publicKey());
        // ---

        expect(valid).toBeTruthy();
    });

    it('fails to verify incorrect signature', async () => {
        const signing1 = new KeyPairSigningProvider(new MockLocalStorage());
        const signing2 = new KeyPairSigningProvider(new MockLocalStorage());
        const obj = { key: 'value' };
        const signature = await signing1.sign(obj);

        // ---
        const valid = await signing1.verify(obj, signature, await signing2.publicKey());
        // ---

        expect(valid).toBeFalsy();
    });
});
