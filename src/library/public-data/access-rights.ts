import { JTDSchemaType } from 'ajv/dist/jtd';

/**
 * Enumeration of possible access rights.
 */
export enum AccessRights {
    None = 'None',
    Read = 'Read',
    ReadWrite = 'ReadWrite',
    ReadAnyWriteOwn = 'ReadAnyWriteOwn'
}

export const accessRightsSchema: JTDSchemaType<AccessRights> = {
    enum: [
        AccessRights.None,
        AccessRights.Read,
        AccessRights.ReadWrite,
        AccessRights.ReadAnyWriteOwn
    ]
};
