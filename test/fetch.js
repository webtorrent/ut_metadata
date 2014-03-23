var fs = require('fs')
var parseTorrent = require('parse-torrent')
var Protocol = require('bittorrent-protocol')
var ut_metadata = require('../')
var test = require('tape')

// Used in multiple tests
var metadata = fs.readFileSync(__dirname + '/torrents/leaves-magnet.torrent')
var parsedTorrent = parseTorrent(metadata)
var id1 = new Buffer('01234567890123456789')
var id2 = new Buffer('12345678901234567890')

test('fetch()', function (t) {
  t.plan(3)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(ut_metadata(metadata)) // wire1 already has metadata
  wire2.use(ut_metadata()) // wire2 does not

  wire2.ext('ut_metadata').fetch()

  wire2.ext('ut_metadata').on('metadata', function (_metadata) {
    // got metadata!
    t.deepEqual(_metadata, metadata)
  })

  wire2.on('handshake', function (infoHash, peerId, extensions) {
    wire2.handshake(parsedTorrent.infoHash, id2)
  })

  wire2.on('extended', function (ext) {
    if (ext === 'handshake') {
      t.pass('got extended handshake')
    } else if (ext === 'ut_metadata') {
      t.pass('got extended ut_metadata message')
      // this is emitted for consistency's sake, but it's ignored
      // by the user since the ut_metadata package handles the
      // complexities internally
    } else {
      t.fail('unexpected handshake type')
    }
  })

  wire1.handshake(parsedTorrent.infoHash, id1)
})

test('fetch() then gotMetadata()', function (t) {
  t.plan(3)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(ut_metadata(metadata)) // wire1 already has metadata
  wire2.use(ut_metadata()) // wire2 does not

  wire2.ext('ut_metadata').fetch()

  // simulate that we just got metadata from another peer, so we set it immediately.
  // 'metadata' event should still get emitted later
  wire2.ext('ut_metadata').gotMetadata(metadata)

  wire2.ext('ut_metadata').on('metadata', function (_metadata) {
    // got metadata!
    t.deepEqual(_metadata, metadata)
  })

  wire2.on('handshake', function (infoHash, peerId, extensions) {
    wire2.handshake(parsedTorrent.infoHash, id2)
  })

  wire2.on('extended', function (ext) {
    if (ext === 'handshake') {
      t.pass('got extended handshake')
    } else if (ext === 'ut_metadata') {
      t.pass('got extended ut_metadata message')
      // this is emitted for consistency's sake, but it's ignored
      // by the user since the ut_metadata package handles the
      // complexities internally
    } else {
      t.fail('unexpected handshake type')
    }
  })

  wire1.handshake(parsedTorrent.infoHash, id1)
})

test('fetch() from peer without metadata', function (t) {
  t.plan(1)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(ut_metadata()) // neither wire has metadata
  wire2.use(ut_metadata())

  wire2.ext('ut_metadata').fetch()

  wire2.ext('ut_metadata').on('metadata', function () {
    t.fail('No "metadata" event should fire')
  })

  wire1.ext('ut_metadata').onMessage = function () {
    t.fail('No messages should be sent to wire1')
    // No messages should be sent because wire1 never sent metadata_size in the
    // extended handshake, so he doesn't have metadata
  }

  wire2.on('handshake', function (infoHash, peerId, extensions) {
    wire2.handshake(parsedTorrent.infoHash, id2)
  })

  wire2.on('extended', function (ext) {
    if (ext === 'handshake') {
      t.pass('got extended handshake')
    } else if (ext === 'ut_metadata') {
      t.fail('should not get extended ut_metadata message')
    } else {
      t.fail('unexpected handshake type')
    }
  })

  wire1.handshake(parsedTorrent.infoHash, id1)
})