export interface ICryptoProvider {
    sign(obj: any): Promise<string>;
    verify(obj: any, signature: string, publicKey: string): Promise<boolean>;
    publicKey(): Promise<string>;
    encrypt(plainText: string): Promise<string>;
    decrypt(cipherText: string): Promise<string>;
}