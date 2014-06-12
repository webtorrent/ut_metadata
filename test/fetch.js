var fs = require('fs')
var parseTorrent = require('parse-torrent')
var Protocol = require('bittorrent-protocol')
var ut_metadata = require('../')
var bencode = require('bencode')
var test = require('tape')

// Used in multiple tests
var metadata = fs.readFileSync(__dirname + '/torrents/leaves-magnet.torrent')
var parsedTorrent = parseTorrent(metadata)

var largeMetadata = fs.readFileSync(__dirname + '/torrents/ubuntu-12.04.4-alternate-amd64.iso.torrent')
var largeParsedTorrent = parseTorrent(largeMetadata)

var id1 = new Buffer('01234567890123456789')
var id2 = new Buffer('12345678901234567890')

test('fetch()', function (t) {
  t.plan(3)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(ut_metadata(metadata)) // wire1 already has metadata
  wire2.use(ut_metadata()) // wire2 does not

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', function (_metadata) {
    // got metadata!
    t.equal(_metadata.toString('hex'), bencode.encode({ info: bencode.decode(metadata).info }).toString('hex'))
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
  t.plan(2)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(ut_metadata()) // neither wire has metadata
  wire2.use(ut_metadata())

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', function () {
    t.fail('No "metadata" event should fire')
  })

  wire1.ut_metadata.onMessage = function () {
    t.fail('No messages should be sent to wire1')
    // No messages should be sent because wire1 never sent metadata_size in the
    // extended handshake, so he doesn't have metadata
  }

  wire2.ut_metadata.on('warning', function (err) {
    t.pass('got warning about peer missing metadata')
  })

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

test('fetch when peer gets metadata later (setMetadata)', function (t) {
  t.plan(3)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(ut_metadata()) // wire1 starts without metadata

  process.nextTick(function () {
    wire1.ut_metadata.setMetadata(metadata) // wire1 gets metadata later

    process.nextTick(function () {
      // wire2 does not start with metadata, but connects to wire1 after it gets metadata
      wire2.use(ut_metadata())
      wire2.ut_metadata.fetch()

      wire2.ut_metadata.on('metadata', function (_metadata) {
        // got metadata!
        t.equal(_metadata.toString('hex'), bencode.encode({ info: bencode.decode(metadata).info }).toString('hex'))
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
  })
})

test('fetch() large torrent', function (t) {
  t.plan(4)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(ut_metadata(largeMetadata)) // wire1 already has metadata
  wire2.use(ut_metadata()) // wire2 does not

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', function (_metadata) {
    // got metadata!
    t.equal(_metadata.toString('hex'), bencode.encode({ info: bencode.decode(largeMetadata).info }).toString('hex'))
  })

  wire2.on('handshake', function (infoHash, peerId, extensions) {
    wire2.handshake(largeParsedTorrent.infoHash, id2)
  })

  wire2.on('extended', function (ext) {
    if (ext === 'handshake') {
      t.pass('got extended handshake')
    } else if (ext === 'ut_metadata') {
      // note: this should get called twice, once for each block of the ubuntu metadata
      t.pass('got extended ut_metadata message')

      // this is emitted for consistency's sake, but it's ignored
      // by the user since the ut_metadata package handles the
      // complexities internally
    } else {
      t.fail('unexpected handshake type')
    }
  })

  wire1.handshake(largeParsedTorrent.infoHash, id1)
})

test('discard invalid metadata', function (t) {
  t.plan(1)

  var wire1 = new Protocol()
  var wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  var invalidMetadata = metadata.slice(0)
  invalidMetadata[55] = 65 // mess up a byte in the info block

  wire1.use(ut_metadata(invalidMetadata))
  wire2.use(ut_metadata())

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', function () {
    t.fail('No "metadata" event should fire')
  })

  wire2.ut_metadata.on('warning', function (err) {
    t.pass('got warning because peer sent reject too much')
  })

  wire2.on('handshake', function (infoHash, peerId, extensions) {
    wire2.handshake(parsedTorrent.infoHash, id2)
  })

  wire1.handshake(parsedTorrent.infoHash, id1)
})
