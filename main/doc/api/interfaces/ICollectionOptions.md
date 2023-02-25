[bonono](../README.md) / ICollectionOptions

# Interface: ICollectionOptions

Options for creating/opening a collection.

## Table of contents

### Properties

- [address](ICollectionOptions.md#address)
- [compactThreshold](ICollectionOptions.md#compactthreshold)
- [complexity](ICollectionOptions.md#complexity)
- [conflictResolution](ICollectionOptions.md#conflictresolution)
- [entryBlockSize](ICollectionOptions.md#entryblocksize)
- [lowerClock](ICollectionOptions.md#lowerclock)
- [publicAccess](ICollectionOptions.md#publicaccess)
- [upperClock](ICollectionOptions.md#upperclock)

## Properties

### address

• **address**: `string`

Store address.

**`Remarks`**

Set this to open an existing store

**`Default Value`**

unset (i.e. create new store)

___

### compactThreshold

• **compactThreshold**: `number`

Compact threshold.

**`Remarks`**

Specifies the number of inserts after which a compaction should
be triggered.

**`Default Value`**

128

___

### complexity

• **complexity**: `number`

Entry signature complexity.

**`Remarks`**

Required complexity of entry proof-of-work signatures. If zero, no signature is required.

**`Default Value`**

0

___

### conflictResolution

• **conflictResolution**: [`ConflictResolution`](../enums/ConflictResolution.md)

Conflict resolution mode.

**`Remarks`**

Specifies how to resolve multiple writes to the same key

**`Default Value`**

[LastWriteWins](../enums/ConflictResolution.md#lastwritewins)

___

### entryBlockSize

• **entryBlockSize**: `number`

Entry block size.

**`Remarks`**

Specifies the number of entries to batch in a block.

**`Default Value`**

16

___

### lowerClock

• **lowerClock**: `number`

Lower clock value (inclusive) of entries to be indexed.

**`Default Value`**

0

___

### publicAccess

• **publicAccess**: [`AccessRights`](../enums/AccessRights.md)

Public access rights.

**`Remarks`**

Determines the access rights for peers other than the creator.

**`Default Value`**

[Read](../enums/AccessRights.md#read)

___

### upperClock

• **upperClock**: `number`

Upper clock value (exclusive) of entries to be indexed.

**`Remarks`**

Set to -1 to disable max clock constraint

**`Default Value`**

-1
