import { JTDSchemaType } from 'ajv/dist/jtd';

/**
 * Describes how to handle multiple writes to the same key.
 */
export enum ConflictResolution {
    /**
     * The write with the greatest clock value is selected.
     */
    LastWriteWins = 'LastWriteWins',

    /**
     * The write with the smallest clock value is selected.
     */
    FirstWriteWins = 'FirstWriteWins'
}

export const conflictResolutionSchema: JTDSchemaType<ConflictResolution> = {
    enum: [
        ConflictResolution.LastWriteWins,
        ConflictResolution.FirstWriteWins
    ]
};
