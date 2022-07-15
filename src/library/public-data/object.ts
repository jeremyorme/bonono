import { JTDSchemaType } from 'ajv/dist/jtd';

export interface IObject {
    _id: string;
}

export const objectSchema: JTDSchemaType<IObject> = {
    properties: {
        _id: { type: 'string' }
    },
    additionalProperties: true  
}