var fs = require('fs')
var Protocol = require('bittorrent-protocol')
var ut_metadata = require('../')
var bencode = require('bencode')
var test = require('tape')

// Used in multiple tests
var metadata = fs.readFileSync(__dirname + '/torrents/leaves-magnet.torrent')

test('wire.use(ut_metadata())', function (t) {
  var wire = new Protocol()
  wire.pipe(wire)

  wire.use(ut_metadata())

  t.ok(wire.ut_metadata)
  t.ok(wire.ut_metadata.fetch)
  t.ok(wire.ut_metadata.cancel)
  t.notOk(wire.ut_metadata.metadata)
  t.end()
})

test('wire.use(ut_metadata(metadata))', function (t) {
  var wire = new Protocol()
  wire.pipe(wire)

  wire.use(ut_metadata(metadata))

  t.ok(wire.ut_metadata)
  t.ok(wire.ut_metadata.fetch)
  t.ok(wire.ut_metadata.cancel)
  t.equal(wire.ut_metadata.metadata.toString('hex'), bencode.encode(bencode.decode(metadata).info).toString('hex'))
  t.end()
})
