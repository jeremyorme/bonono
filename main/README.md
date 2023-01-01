# Bonono

Bonono is a simple peer-to-peer data store that provides:

* Automatic replication
* Load time complexity of O(N_entries) 
* Public access control (read, read/write, read-all/write-own, none)

Why is it called Bonono? Simple, Opple sounded too silly.

**DISCLAIMER**: Bonono alpha software and is built on top of [js-ipfs](https://js.ipfs.tech/).

>"The js-ipfs library is in Alpha state. The codebase hasn't been audited by security specialists and it shouldn't be used to store, share or publish sensitive information."

## Using Bonono

- Put a script tag `<script type='module' src='https://unpkg.com/bonono@0.5.1/dist/bonono/bonono.esm.js'></script>` in the head of your index.html
- Then you can use Bonono anywhere in your template, JSX, html etc

See the [Bonono DB component reference](main/src/components/bonono-db/readme.md) and [Bonono API](main/doc/api/README.md)

## Tutorials

Getting started:
* [Bonono with React](main/doc/react/getting-started.md)

## Development

To develop Bonono, clone this repo to a new directory:

```bash
git clone https://github.com/jeremyorme/bonono.git
cd bonono/main
```

and run:

```bash
npm install
npm start
```

To build the component for production, run:

```bash
npm run build
```

To run the unit tests for the component, run:

```bash
npm test
```
