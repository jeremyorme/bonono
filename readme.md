# Bonono

Bonono is a simple peer-to-peer data store that provides:

* Automatic replication
* Load time complexity of O(N_entries) 
* Public access control (read, read/write, read-all/write-own, none)

Why is it called Bonono? Simple, Opple sounded too silly.

**DISCLAIMER**: Bonono alpha software and is built on top of [js-ipfs](https://js.ipfs.tech/).

>"The js-ipfs library is in Alpha state. The codebase hasn't been audited by security specialists and it shouldn't be used to store, share or publish sensitive information."

# Bonono DB component

The [Bonono DB component](main/README.md) can be used directly in Stencil and no-framework applications.

# Framework specific wrapper components

Wrapper components wrap the Bonono DB component to be consumed by specific frameworks:

* [Bonono React component](bonono-react/README.md)

# Roadmap

There are no specific plans to add functionality to Bonono at this point. Work is currently underway on a comprehensive demonstration app with the intention of proving the performance of Bonono and ironing out any issues prior to releasing version 1.0.0.