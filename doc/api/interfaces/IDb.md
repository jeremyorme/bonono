[bonono](../README.md) / IDb

# Interface: IDb

Provides access to a named database.

## Table of contents

### Methods

- [collection](IDb.md#collection)

## Methods

### collection

▸ **collection**(`name`): `Promise`<[`IDbCollection`](IDbCollection.md)\>

Creates/opens a named collection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Collection name |

#### Returns

`Promise`<[`IDbCollection`](IDbCollection.md)\>

Promise resolving to a collection interface

▸ **collection**(`name`, `options`): `Promise`<[`IDbCollection`](IDbCollection.md)\>

Creates/opens a named collection with the specified options.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | Collection name |
| `options` | `Partial`<[`ICollectionOptions`](ICollectionOptions.md)\> | Collection options |

#### Returns

`Promise`<[`IDbCollection`](IDbCollection.md)\>

Promise resolving to a collection interface
