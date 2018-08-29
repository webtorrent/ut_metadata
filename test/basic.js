const { leavesMetadata } = require('webtorrent-fixtures')
const bencode = require('bencode')
const Protocol = require('bittorrent-protocol')
const test = require('tape')
const utMetadata = require('../')

test('wire.use(utMetadata())', t => {
  const wire = new Protocol()
  wire.pipe(wire)

  wire.use(utMetadata())

  t.ok(wire.ut_metadata)
  t.ok(wire.ut_metadata.fetch)
  t.ok(wire.ut_metadata.cancel)
  t.notOk(wire.ut_metadata.metadata)
  t.end()
})

test('wire.use(utMetadata(metadata))', t => {
  const wire = new Protocol()
  wire.pipe(wire)

  wire.use(utMetadata(leavesMetadata.torrent))

  t.ok(wire.ut_metadata)
  t.ok(wire.ut_metadata.fetch)
  t.ok(wire.ut_metadata.cancel)
  t.equal(
    wire.ut_metadata.metadata.toString('hex'),
    bencode.encode(bencode.decode(leavesMetadata.torrent).info).toString('hex')
  )
  t.end()
})
