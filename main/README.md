# Bonono

Bonono is a simple peer-to-peer data store that provides:

* Automatic replication
* Load time complexity of O(N_entries) 
* Public access control (read, read/write, read-all/write-own, none)

Why is it called Bonono? Simple, Opple sounded too silly.

**DISCLAIMER**: Bonono is alpha software.

## Using Bonono

- Put a script tag `<script type='module' src='https://unpkg.com/bonono@0.6.0/dist/bonono/bonono.esm.js'></script>` in the head of your index.html

# API reference

See the [Bonono API reference](main/doc/api/README.md).

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
