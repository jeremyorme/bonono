import { JTDSchemaType } from 'ajv/dist/jtd';

export interface IProof {
    signature: string;
    nonce: string;
}

export const proofSchema: JTDSchemaType<IProof> = {
    properties: {
        signature: { type: 'string' },
        nonce: { type: 'string' }
    }
}