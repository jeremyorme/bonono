[bonono](../README.md) / IDbClient

# Interface: IDbClient

Handles the connection to IPFS and opening databases.

## Table of contents

### Methods

- [address](IDbClient.md#address)
- [close](IDbClient.md#close)
- [connect](IDbClient.md#connect)
- [db](IDbClient.md#db)
- [id](IDbClient.md#id)

## Methods

### address

▸ **address**(): `string`

Address for connecting to IPFS.

#### Returns

`string`

The address

___

### close

▸ **close**(): `Promise`<`void`\>

Close the IPFS connection.

#### Returns

`Promise`<`void`\>

A promise that resolves on completion

___

### connect

▸ **connect**(): `Promise`<`boolean`\>

Connect to IPFS.

#### Returns

`Promise`<`boolean`\>

A promise indicating whether connection succeeded

___

### db

▸ **db**(`name`): `Promise`<``null`` \| [`IDb`](IDb.md)\>

Opens a named database.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Unique database name |

#### Returns

`Promise`<``null`` \| [`IDb`](IDb.md)\>

Database interface

___

### id

▸ **id**(): ``null`` \| `string`

ID string used to identify the current user.

**`Remarks`**

Returns own ID after successful call to connect, otherwise null

#### Returns

``null`` \| `string`

Own ID string
