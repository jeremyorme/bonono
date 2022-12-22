export interface ICryptoProvider {
    sign(obj: any): Promise<string>;
    sign_complex(obj: any, prefix: string, complexity: number): Promise<[string, string]>;
    verify(obj: any, signature: string, publicKey: string): Promise<boolean>;
    verify_complex(obj: any, signature: string, publicKey: string, prefix: string, nonce: string, complexity: number): Promise<boolean>;
    publicKey(): Promise<string>;
    encrypt(plainText: string): Promise<string>;
    decrypt(cipherText: string): Promise<string>;
}