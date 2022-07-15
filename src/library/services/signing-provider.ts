export interface ISigningProvider {
    sign(obj: any): Promise<string>;
    verify(obj: any, signature: string, publicKey: string): Promise<boolean>;
    id(): Promise<string>;
    publicKey(): Promise<string>;
}