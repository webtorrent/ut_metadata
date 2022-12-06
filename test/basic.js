import fixtures from 'webtorrent-fixtures'
import bencode from 'bencode'
import Protocol from 'bittorrent-protocol'
import test from 'tape'
import utMetadata from '../index.js'

const { leavesMetadata } = fixtures

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
