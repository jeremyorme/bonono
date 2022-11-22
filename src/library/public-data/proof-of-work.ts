import { JTDSchemaType } from 'ajv/dist/jtd';

export interface IProofOfWork {
    signature: string;
    nonce: string;
}

export const proofOfWorkSchema: JTDSchemaType<IProofOfWork> = {
    properties: {
        signature: { type: 'string' },
        nonce: { type: 'string' }
    }
}