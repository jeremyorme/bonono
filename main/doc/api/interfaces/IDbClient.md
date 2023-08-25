[bonono](../README.md) / IDbClient

# Interface: IDbClient

Interface for creating/opening databases.

## Table of contents

### Methods

- [close](IDbClient.md#close)
- [connect](IDbClient.md#connect)
- [db](IDbClient.md#db)
- [publicKey](IDbClient.md#publickey)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

Close the DB client.

#### Returns

`Promise`<`void`\>

A promise that resolves on completion

___

### connect

▸ **connect**(): `Promise`<`boolean`\>

Connect the DB client.

#### Returns

`Promise`<`boolean`\>

A promise indicating whether connection succeeded

**`Remarks`**

Must be called first to initialise the client

___

### db

▸ **db**(`name`): `Promise`<``null`` \| [`IDb`](IDb.md)\>

Creates/opens a named database.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Unique database name |

#### Returns

`Promise`<``null`` \| [`IDb`](IDb.md)\>

Database interface

___

### publicKey

▸ **publicKey**(): ``null`` \| `string`

Public key of the current user.

#### Returns

``null`` \| `string`

Own public key string

**`Remarks`**

Returns own public key after successful call to connect, otherwise null
