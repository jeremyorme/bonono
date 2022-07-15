# Bonono

Bonono is a simple peer-to-peer data store that provides:

* Automatic replication
* Load time complexity of O(N_entries) 
* Public/private access control

Why is it called Bonono? Simple, Opple sounded too silly.

## Using this component

There are three strategies we recommend for using web components built with Stencil.

The first step for all three of these strategies is to [publish to NPM](https://docs.npmjs.com/getting-started/publishing-npm-packages).

### Script tag

- Put a script tag similar to this `<script type='module' src='https://unpkg.com/bonono@0.0.1/dist/bonono.esm.js'></script>` in the head of your index.html
- Then you can use the element anywhere in your template, JSX, html etc

### Node Modules
- Run `npm install bonono --save`
- Put a script tag similar to this `<script type='module' src='node_modules/bonono/dist/bonono.esm.js'></script>` in the head of your index.html
- Then you can use the element anywhere in your template, JSX, html etc

### In a stencil-starter app
- Run `npm install bonono --save`
- Add an import to the npm packages `import bonono;`
- Then you can use the element anywhere in your template, JSX, html etc

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