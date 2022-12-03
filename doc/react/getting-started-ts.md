# Getting started - Bonono with React (Typescript)

## What you'll learn

This is a brief tutorial that will teach you how to:

* Include Bonono and its dependencies into a React app with `<script>` tags
* Get the DbClient object, connect and then open a database and collection
* Write some data and read it back
* Ensure data replicates between multiple browsers

Finally, we close up with a brief discussion of data persistence in peer-to-peer networks.

## Prerequisites

This tutorial assumes that you are already familiar with the basics of React. If not, it's recommended to at least work through an introductory tutorial such as [Tutorial: Intro to React](https://reactjs.org/tutorial/tutorial.html) beforehand.

Ensure you have:

* A recent LTS version of NodeJS
* A recent version of npm

## Create a React app

For this tutorial we'll create a new React app using `create-react-app`:

```bash
npx create-react-app bonono-app-ts --template typescript
cd bonono-app-ts
npm start
```

## Include Bonono and dependencies

The newly created React project should have an `index.html` file in `bonono-app-ts/public/`. Add the following script tag to the `<head>` section:

```html
<script type='module' src='https://unpkg.com/bonono@0.3.0/dist/bonono/bonono.esm.js'></script>
```

Bonono depends on [JS-IPFS](https://js.ipfs.io) so it is also necessary to add the following script tag:

```html
<script src="https://cdn.jsdelivr.net/npm/ipfs@0.61.0/index.min.js"></script>
```

## Connect and open a data store with DbClient

The pre-generated `App` component in `bonono-app-ts/src/App.tsx` is a function and we need to convert this to a class so we can store our store instance as a member. Let's also remove the `<p>` and `<a>` elements from the `<header>` to reduce the noise:

```tsx
class App extends React.Component {
    render() {
        return (
            <div className="App">
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                </header>
            </div>
        );
    }
}
```

Next, we'll add our Bonono component that gives us access to the Bonono data store API. We add a `ref` so we can access the `<Bonono>` element:

```tsx
class App extends React.Component {
    constructor(props) {
        super(props);
        this.bononoRef = React.createRef(null);
    }

    render() {
        return (
            <div className="App">
                <bonono-db ref={this.bononoRef} />
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                </header>
            </div>
        );
    }
}
```

The `bonono-db` component produces an event `onDbClient` containing a reference to the top level `DbClient` object. We subscribe to the event in `componentDidMount` where we know the `ref` has been initialized and pass the `DbClient` to `initDb`:

```tsx
    componentDidMount() {
        this.bononoRef.current.addEventListener("dbClient", e => this.initDb(e.detail));
    }

    async initDb(dbClient) {
        // ...
    }
```

The generated app has `React.StrictMode` enabled (in `index.tsx`):

```tsx
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
```

We'll disable it for this example because it causes `componentDidMount` to be invoked twice:

```tsx
root.render(
    <App />
);
```

We can now implement `initDb` to open a named database and create a named collection within it:

```tsx
    async initDb(dbClient) {
        await dbClient.connect();
        const db = await dbClient.db('bonono-app');
        const collection = await db.collection('my-collection');
    }
```

## Writing and reading

Now we have a collection, let's put something in it. Firstly, we'll render an `<input>` field to provide a means of entering some data:

```tsx
    async write(text) {
        // ...
    }

    render() {
        return (
            <div className="App">
                <bonono-db onDbClient={ev => this.initDb(ev.detail)} />
                <input type="text" value={this.state.value} onChange={ev => this.write(ev.target.value)} />
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                </header>
            </div>
        );
    }
```

We need to initialize the component state:

```tsx
    constructor(props) {
        super(props);
        this.state = {value: ''};
    }
```

Then we can implement the `write` method to write to the collection we already created and update the state:

```tsx
    async write(text) {
        this.collection.insertOne({_id: 'key', value: text});
        this.setState({ value: text });
    }
```

Finally, in `initDb`, we read the value with key `'key'` from the collection and set it into our component state:

```tsx
    async initDb(dbClient) {
        await dbClient.connect();
        this.db = await dbClient.db('bonono-app');
        this.collection = await this.db.collection('my-collection');

        const entry = collection.findOne({ _id: 'key' }) || { value: '' };
        this.setState({ collection, value: entry.value });
    }
```

Let's test what we have done:

* Run the app type some text into the `<input>` field
* Close the browser and restart the app
* You should see the same text you typed re-appear in the `<input>` field.

## Replication

So far our app works in a single browser but if we open two different browsers (e.g. Chrome + Safari) we'll notice that they don't see the same data. To fix this we need to enable replication.

### What is replication?

Peer-to-peer databases work differently from conventional client-server databases...

* With client-server, data is located in one place on a special node - the server - and is retrieved by sending queries to that node.
* In the peer-to-peer world, there is no special node with exclusive ownership of the data. Peers hold replicas of the data they are interested in and exchange updates to keep those replicas consistent.

### Enabling replication

Replication is automatic in Bonono. However, in order for peers to find each other, we need to connect to WebRTC star servers. These are purely used to locate other peers and do not see or store any application data.

The WebRTC star servers are provided in the `address` property of the `<bonono-db>` component:

```tsx
                <bonono-db address="/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/;/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/;/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/"
                           onDbClient={ev => this.initDb(ev.detail)} />
```

**NOTE:** It is strongly recommended to set up your own WebRTC star server rather than relying on the above servers, which can be heavily loaded and are only really suitable for basic development/testing purposes.

## Data persistence

It's worth briefly discussing persistence because where the data lives and what happens to it when peers go offline can often cause confusion.

Data in a peer-to-peer database is distributed between the network nodes. A given node will typically hold data that was needed to satisfy queries driven by the activity of the user of that node.

Peers continually enter and leave the network. If no other peer was replicating some data when the peer owning it left, then it will no longer be available to other peers.

To mitigate this, a production app should include one or more always-on peers in the network that would replicate every collection. If this sounds like a regression to client-server architecture, rest assured that this always-on peer has no special privileges - any participant in the network could set themselves up in that role.