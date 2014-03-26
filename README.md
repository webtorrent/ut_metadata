# ut_metadata [![travis](http://img.shields.io/travis/feross/ut_metadata.svg)](https://travis-ci.org/feross/ut_metadata) [![npm](http://img.shields.io/npm/v/ut_metadata.svg)](https://npmjs.org/package/ut_metadata) [![gittip](http://img.shields.io/gittip/feross.svg)](https://www.gittip.com/feross/)

### [BitTorrent] Extension for Peers to Send Metadata Files (BEP 9)

[![browser support](https://ci.testling.com/feross/ut_metadata.png)](https://ci.testling.com/feross/ut_metadata)

Node.js implementation of the [Extension for Peers to Send Metadata Files (BEP 9)](http://www.bittorrent.org/beps/bep_0009.html).

The purpose of this extension is to allow clients to join a swarm and complete a download without the need of downloading a .torrent file first. This extension instead allows clients to download the metadata from peers. It makes it possible to support magnet links, a link on a web page only containing enough information to join the swarm (the info hash).

Works in the browser with [browserify](http://browserify.org/)! This module is used by [WebTorrent](http://webtorrent.io).

## install

```
npm install ut_metadata
```

## usage

This package should be used with [bittorrent-protocol](https://github.com/feross/bittorrent-protocol), which supports a plugin-like system for extending the protocol with additional functionality.

Say you're already using `bittorrent-protocol`. Your code might look something like this:

```js
var Protocol = require('bittorrent-protocol')
var net = require('net')

net.createServer(function (socket) {
  var wire = new Protocol()
  socket.pipe(wire).pipe(socket)

  // handle handshake
  wire.on('handshake', function (infoHash, peerId) {
    wire.handshake(new Buffer('my info hash'), new Buffer('my peer id'))
  })

}).listen(6881)
```

To add support for BEP 9, simply modify your code like this:

```js
var Protocol = require('bittorrent-protocol')
var net = require('net')
var ut_metadata = require('ut_metadata')

net.createServer(function (socket) {
  var wire = new Protocol()
  socket.pipe(wire).pipe(socket)

  // initialize the extension
  wire.use(ut_metadata())

  // all `ut_metadata` functionality can now be accessed at wire.ut_metadata

  // ask the peer to send us metadata
  wire.ut_metadata.fetch()

  // 'metadata' event will fire when the metadata arrives and is verified to be correct!
  wire.ut_metadata.on('metadata', function (metadata) {
    // got metadata!

    // Note: the event will not fire if the peer does not support ut_metadata, if they
    // don't have metadata yet either, if they repeatedly send invalid data, or if they
    // simply don't respond.
  })

  // optionally, listen to the 'warning' event if you want to know that metadata is
  // probably not going to arrive for one of the above reasons.
  wire.ut_metadata.on('warning', function (err) {
    console.log(err.message)
  })

  // handle handshake
  wire.on('handshake', function (infoHash, peerId) {
    wire.handshake(new Buffer('my info hash'), new Buffer('my peer id'))
  })

}).listen(6881)
```

## methods

### fetch

Ask the peer to send metadata.

```js
wire.ut_metadata.fetch()
```

### cancel

Stop asking the peer to send metadata.

```js
wire.ut_metadata.cancel()
```

### event: 'metadata'

Fired when metadata is available and verified to be correct. Called with a single
parameter of type Buffer.

```js
wire.ut_metadata.on('metadata', function (metadata) {
  console.log(Buffer.isBuffer(metadata)) // true
})
```

Note: the event will not fire if the peer does not support ut_metadata, if they
don't have metadata yet either, if they repeatedly send invalid data, or if they
simply don't respond.

### event: 'warning'

Fired if:
 - the peer does not support ut_metadata
 - the peer doesn't have metadata yet
 - the repeatedly sent invalid data

```js
wire.ut_metadata.on('warning', function (err) {
  console.log(err.message)
})
```

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
