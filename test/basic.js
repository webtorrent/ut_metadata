var fs = require('fs')
var Protocol = require('bittorrent-protocol')
var ut_metadata = require('../')
var test = require('tape')

// Used in multiple tests
var metadata = fs.readFileSync(__dirname + '/torrents/leaves-magnet.torrent')

test('wire.use(ut_metadata())', function (t) {
  var wire = new Protocol()
  wire.pipe(wire)

  wire.use(ut_metadata())

  t.ok(wire.ext('ut_metadata'))
  t.ok(wire.ext('ut_metadata').fetch)
  t.ok(wire.ext('ut_metadata').cancel)
  t.notOk(wire.ext('ut_metadata').metadata)
  t.end()
})

test('wire.use(ut_metadata(metadata))', function (t) {
  var wire = new Protocol()
  wire.pipe(wire)

  wire.use(ut_metadata(metadata))

  t.ok(wire.ext('ut_metadata'))
  t.ok(wire.ext('ut_metadata').fetch)
  t.ok(wire.ext('ut_metadata').cancel)
  t.equal(wire.ext('ut_metadata').metadata, metadata)
  t.end()
})
