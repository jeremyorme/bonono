[bonono](../README.md) / AccessRights

# Enumeration: AccessRights

Describes types of access to be granted.

## Table of contents

### Enumeration Members

- [None](AccessRights.md#none)
- [Read](AccessRights.md#read)
- [ReadAnyWriteOwn](AccessRights.md#readanywriteown)
- [ReadWrite](AccessRights.md#readwrite)

## Enumeration Members

### None

• **None** = ``"None"``

Both read and write access are denied.

___

### Read

• **Read** = ``"Read"``

Read access is granted and write access is denied.

___

### ReadAnyWriteOwn

• **ReadAnyWriteOwn** = ``"ReadAnyWriteOwn"``

Read access to any key and write access to own key are granted
but write access to other keys is denied.

___

### ReadWrite

• **ReadWrite** = ``"ReadWrite"``

Both read and write access are granted.
