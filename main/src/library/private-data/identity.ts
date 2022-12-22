import { JTDSchemaType } from 'ajv/dist/jtd';

export interface IIdentity {
    publicKey: string;
}

export const identitySchema: JTDSchemaType<IIdentity> = {
    properties: {
        publicKey: { type: 'string' }
    }
}