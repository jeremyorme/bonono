[bonono](../README.md) / IDbCollection

# Interface: IDbCollection

Interface for querying and updating a collection.

## Table of contents

### Accessors

- [all](IDbCollection.md#all)

### Methods

- [address](IDbCollection.md#address)
- [canRead](IDbCollection.md#canread)
- [canWrite](IDbCollection.md#canwrite)
- [findOne](IDbCollection.md#findone)
- [insertMany](IDbCollection.md#insertmany)
- [insertOne](IDbCollection.md#insertone)
- [numEntries](IDbCollection.md#numentries)
- [onUpdated](IDbCollection.md#onupdated)

## Accessors

### all

• `get` **all**(): `IterableIterator`<[`string`, `any`]\>

Gets an iterator over all items in the collection.

#### Returns

`IterableIterator`<[`string`, `any`]\>

Iterator over all items in the collection

## Methods

### address

▸ **address**(): `string`

Gets the address of this store.

**`Remarks`**

The store address is defined as the CID of its manifest

#### Returns

`string`

Store address

___

### canRead

▸ **canRead**(): `boolean`

Gets whether the current identity has read access to the store.

#### Returns

`boolean`

true if read access granted, otherwise false

___

### canWrite

▸ **canWrite**(): `boolean`

Gets whether the current identity has write access to the store.

#### Returns

`boolean`

true if write access granted, otherwise false

___

### findOne

▸ **findOne**(`query`): `any`

Finds and returns an object in the collection.

**`Remarks`**

Currently only index search is supported so the query object must be
of the form `{_id: key}` where `key` is the same key supplied to and/or returned
by [insertOne](IDbCollection.md#insertone) or [insertMany](IDbCollection.md#insertmany).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | `any` | Query object containing search criteria |

#### Returns

`any`

The first matching object, or null if none was found

___

### insertMany

▸ **insertMany**(`docs`): `Promise`<`string`[]\>

Inserts a multiple objects into the collection.

**`Remarks`**

Each object in `docs` is inserted under the key in its `_id` property.
If the object does not contain `_id` then an auto-generated UUID is used.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `docs` | `any`[] | Array of objects to insert |

#### Returns

`Promise`<`string`[]\>

Array of supplied or generated keys

___

### insertOne

▸ **insertOne**(`doc`): `Promise`<`string`\>

Inserts a single object into the collection.

**`Remarks`**

The `doc` object is inserted under the key in its `_id` property.
If `doc` does not contain `_id` then an auto-generated UUID is used.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `doc` | `any` | Object to insert |

#### Returns

`Promise`<`string`\>

The supplied or generated key

___

### numEntries

▸ **numEntries**(): `number`

Gets the number of entries.

**`Remarks`**

At any given point, the number of entries may exceed the number of
keys as prior values are retained until store compaction occurs.

#### Returns

`number`

Number of entries

___

### onUpdated

▸ **onUpdated**(`callback`): `any`

Registers a callback to be notified following an update.

**`Remarks`**

An update may occur due to a local modification (e.g. from a call to
[insertOne](IDbCollection.md#insertone) or [insertMany](IDbCollection.md#insertmany)) or as a
result of remote updates being merged into the local replica.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callback` | () => `void` | Callback function |

#### Returns

`any`
