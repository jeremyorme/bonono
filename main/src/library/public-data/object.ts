import { JTDSchemaType } from 'ajv/dist/jtd';

export interface IObject {
    _id: string;
    _clock: number;
}

export const objectSchema: JTDSchemaType<IObject> = {
    properties: {
        _id: { type: 'string' },
        _clock: { type: 'uint32' }
    },
    additionalProperties: true
}