# Getting started with Bonono for React

## What you'll learn

This is a brief tutorial that will teach you how to:

* Include IPFS with a `<script>` tag
* Install Bonono for React
* Add a BononoDb component
* Get the DbClient object from the component, connect and then open a database and collection
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
npx create-react-app bonono-app --template typescript
cd bonono-app
npm start
```

## Include Bonono and dependencies

The newly created React project should have an `index.html` file in `bonono-app/public/`. Add the following script tag to the `<head>` section to include [JS-IPFS](https://js.ipfs.io):

```html
<script src="https://cdn.jsdelivr.net/npm/ipfs@0.61.0/index.min.js"></script>
```

## Install Bonono for React

Bonono provides a special package for React that exposes the BononoDb component as a first-class React component. You need to install this as follows:

```bash
npm install bonono-react
```

## Connect and open a data store with DbClient

The pre-generated `App` component in `bonono-app/src/App.js` is a function and we need to convert this to a class so we can store our store instance as a member. Let's also remove the `<p>` and `<a>` elements from the `<header>` to reduce the noise:

```js
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

Next, we'll add our BononoDb component that gives us access to the Bonono data store API. Import the component from `bonono-react`:

```js
import { BononoDb } from 'bonono-react';
```

Then add it to the `render` method:

```js
class App extends React.Component {
    render() {
        return (
            <div className="App">
                <BononoDb />
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                </header>
            </div>
        );
    }
}
```

The `bonono-db` component produces an `onDbClient` event containing a reference to an `IDbClient` interface that we can use to access Bonono. We can simply add a handler for this event and stash the `IDbClient` instance:

```js
    dbClient: IDbClient | undefined;

    async initDb(dbClient: IDbClient) {
        this.dbClient = dbClient;
    }

    render() {
        return (
            <div className="App">
                <BononoDb onDbClient={(e: BononoDbCustomEvent<IDbClient>) => this.initDb(e.detail)} />
                ...
            </div>
        );
    }
```

Remember to add imports for `BononoDbCustomEvent` and `IDbClient`:

```js
import { BononoDb, BononoDbCustomEvent, IDbClient } from 'bonono-react';
```

## Writing and reading

Let's read and write a string in a collection. First we'll define an `IAppState` interface for our React component that will hold the string:

```js
interface IAppState {
    value: string;
}
```

We'll add an instance of this state object to the class and initialize it:

```js
    state: IAppState = {value: ''};
```

We can now implement a method to open a named database and create a named collection within it:

```js
    collection: IDbCollection | undefined;

    async getCollection(): Promise<IDbCollection | undefined> {
        if (!this.dbClient)
            return;

        if (!this.collection) {
            await this.dbClient.connect();
            const db = await this.dbClient.db('bonono-app');
            if (!db)
                return;

            this.collection = await db.collection('my-collection');
            if (!this.collection)
                return;
        }

        return this.collection;
    }
```

Remember to add the import of `IDbCollection`:

```js
import { BononoDb, BononoDbCustomEvent, IDbClient, IDbCollection } from 'bonono-react';
```

Now we can call `getCollection` in `initDb` and read the value with key `'key'` from the collection then set it into our component state:

```js
    async initDb(dbClient: IDbClient) {
        this.dbClient = dbClient;

        const collection = await this.getCollection();
        if (!collection)
            return;

        const entry = collection.findOne({ _id: 'key' }) || { value: '' };
        if (!entry)
            return;
        this.setState({ value: entry.value });
    }
```

All that remains is to write to the collection. Firstly, we'll render an `<input>` field to provide a means of entering some data:

```js
    async write(text: string) {
        // ...
    }

    render() {
        return (
            <div className="App">
                <BononoDb onDbClient={(e: BononoDbCustomEvent<IDbClient>) => this.initDb(e.detail)} />
                <input type="text" value={this.state.value} onChange={ev => this.write(ev.target.value)} />
                ...
            </div>
        );
    }
```

Then we can implement the `write` method to write to the collection and update the state:

```js
    async write(text: string) {
        const collection = await this.getCollection();
        if (!collection)
            return;
            
        collection.insertOne({ _id: 'key', value: text });
        this.setState({ value: text });
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

The WebRTC star servers are provided in the `address` property of the `<BononoDb>` component:

```js
                <BononoDb address="/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/;/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/;/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/"
                           onDbClient={ev => this.initDb(ev.detail)} />
```

**NOTE:** It is strongly recommended to set up your own WebRTC star server rather than relying on the above servers, which can be heavily loaded and are only really suitable for basic development/testing purposes.

## Data persistence

It's worth briefly discussing persistence because where the data lives and what happens to it when peers go offline can often cause confusion.

Data in a peer-to-peer database is distributed between the network nodes. A given node will typically hold data that was needed to satisfy queries driven by the activity of the user of that node.

Peers continually enter and leave the network. If no other peer was replicating some data when the peer owning it left, then it will no longer be available to other peers.

To mitigate this, a production app should include one or more always-on peers in the network that would replicate every collection. If this sounds like a regression to client-server architecture, rest assured that this always-on peer has no special privileges - any participant in the network could set themselves up in that role.