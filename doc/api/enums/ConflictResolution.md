[bonono](../README.md) / ConflictResolution

# Enumeration: ConflictResolution

Describes how to handle multiple writes to the same key.

## Table of contents

### Enumeration Members

- [FirstWriteWins](ConflictResolution.md#firstwritewins)
- [LastWriteWins](ConflictResolution.md#lastwritewins)

## Enumeration Members

### FirstWriteWins

• **FirstWriteWins** = ``"FirstWriteWins"``

The write with the smallest clock value is selected.

___

### LastWriteWins

• **LastWriteWins** = ``"LastWriteWins"``

The write with the greatest clock value is selected.
