# Bonono

Bonono is a simple peer-to-peer data store that provides:

* Automatic replication
* Load time complexity of O(N_entries) 
* Public/private access control

Why is it called Bonono? Simple, Opple sounded too silly.

## Using Bonono

- Put a script tag `<script type='module' src='https://unpkg.com/bonono@0.0.3/dist/bonono/bonono.esm.js'></script>` in the head of your index.html
- Then you can use Bonono anywhere in your template, JSX, html etc

See the [Bonono DB component reference](src/components/bonono-db/readme.md) and [Bonono API](doc/api/README.md)

## Tutorials

Getting started:
* [Bonono with React](doc/react/getting-started.md)

## Development

To develop Bonono, clone this repo to a new directory:

```bash
git clone https://github.com/jeremyorme/bonono.git
cd bonono
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
