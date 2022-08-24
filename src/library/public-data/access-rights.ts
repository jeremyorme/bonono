import { JTDSchemaType } from 'ajv/dist/jtd';

/**
 * Describes types of access to be granted.
 */
export enum AccessRights {
    /**
     * Both read and write access are denied.
     */
    None = 'None',

    /**
     * Read access is granted and write access is denied.
     */
    Read = 'Read',

    /**
     * Both read and write access are granted.
     */
    ReadWrite = 'ReadWrite',

    /**
     * Read access to any key and write access to own key are granted
     * but write access to other keys is denied.
     */
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
