const { leavesMetadata, sintel } = require('webtorrent-fixtures')
const bencode = require('bencode')
const Protocol = require('bittorrent-protocol')
const test = require('tape')
const utMetadata = require('../')

const id1 = Buffer.from('01234567890123456789')
const id2 = Buffer.from('12345678901234567890')

test('fetch()', t => {
  t.plan(3)

  const wire1 = new Protocol()
  const wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(utMetadata(leavesMetadata.torrent)) // wire1 already has metadata
  wire2.use(utMetadata()) // wire2 does not

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', _metadata => {
    // got metadata!
    t.equal(
      _metadata.toString('hex'),
      bencode.encode({
        info: bencode.decode(leavesMetadata.torrent).info
      }).toString('hex')
    )
  })

  wire2.on('handshake', (infoHash, peerId, extensions) => {
    wire2.handshake(leavesMetadata.parsedTorrent.infoHash, id2)
  })

  wire2.on('extended', ext => {
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

  wire1.handshake(leavesMetadata.parsedTorrent.infoHash, id1)
})

test('fetch() from peer without metadata', t => {
  t.plan(2)

  const wire1 = new Protocol()
  const wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(utMetadata()) // neither wire has metadata
  wire2.use(utMetadata())

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', () => {
    t.fail('No "metadata" event should fire')
  })

  wire1.ut_metadata.onMessage = () => {
    t.fail('No messages should be sent to wire1')
    // No messages should be sent because wire1 never sent metadata_size
    // in the extended handshake, so he doesn't have metadata
  }

  wire2.ut_metadata.on('warning', () => {
    t.pass('got warning about peer missing metadata')
  })

  wire2.on('handshake', (infoHash, peerId, extensions) => {
    wire2.handshake(leavesMetadata.parsedTorrent.infoHash, id2)
  })

  wire2.on('extended', ext => {
    if (ext === 'handshake') {
      t.pass('got extended handshake')
    } else if (ext === 'ut_metadata') {
      t.fail('should not get extended ut_metadata message')
    } else {
      t.fail('unexpected handshake type')
    }
  })

  wire1.handshake(leavesMetadata.parsedTorrent.infoHash, id1)
})

test('fetch when peer gets metadata later (setMetadata)', t => {
  t.plan(3)

  const wire1 = new Protocol()
  const wire2 = new Protocol()

  wire1.pipe(wire2).pipe(wire1)

  wire1.use(utMetadata()) // wire1 starts without metadata

  process.nextTick(() => {
    // wire1 gets metadata later
    wire1.ut_metadata.setMetadata(leavesMetadata.torrent)

    process.nextTick(() => {
      // wire2 does not start with metadata,
      // but connects to wire1 after it gets metadata
      wire2.use(utMetadata())
      wire2.ut_metadata.fetch()

      wire2.ut_metadata.on('metadata', _metadata => {
        // got metadata!
        t.equal(
          _metadata.toString('hex'),
          bencode.encode({
            info: bencode.decode(leavesMetadata.torrent).info
          }).toString('hex')
        )
      })

      wire2.on('handshake', (infoHash, peerId, extensions) => {
        wire2.handshake(leavesMetadata.parsedTorrent.infoHash, id2)
      })

      wire2.on('extended', ext => {
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

      wire1.handshake(leavesMetadata.parsedTorrent.infoHash, id1)
    })
  })
})

test('fetch() large torrent', t => {
  t.plan(4)

  const wire1 = new Protocol()
  const wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  wire1.use(utMetadata(sintel.torrent)) // wire1 already has metadata
  wire2.use(utMetadata()) // wire2 does not

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', _metadata => {
    // got metadata!
    t.equal(
      _metadata.toString('hex'),
      bencode.encode({
        info: bencode.decode(sintel.torrent).info
      }).toString('hex')
    )
  })

  wire2.on('handshake', (infoHash, peerId, extensions) => {
    wire2.handshake(sintel.parsedTorrent.infoHash, id2)
  })

  wire2.on('extended', ext => {
    if (ext === 'handshake') {
      t.pass('got extended handshake')
    } else if (ext === 'ut_metadata') {
      // note: this should get called twice,
      // once for each block of the sintel metadata
      t.pass('got extended ut_metadata message')

      // this is emitted for consistency's sake, but it's ignored
      // by the user since the ut_metadata package handles the
      // complexities internally
    } else {
      t.fail('unexpected handshake type')
    }
  })

  wire1.handshake(sintel.parsedTorrent.infoHash, id1)
})

test('discard invalid metadata', t => {
  t.plan(1)

  const wire1 = new Protocol()
  const wire2 = new Protocol()
  wire1.pipe(wire2).pipe(wire1)

  const invalidMetadata = leavesMetadata.torrent.slice(0)
  invalidMetadata[55] = 65 // mess up a byte in the info block

  wire1.use(utMetadata(invalidMetadata))
  wire2.use(utMetadata())

  wire2.ut_metadata.fetch()

  wire2.ut_metadata.on('metadata', () => {
    t.fail('No "metadata" event should fire')
  })

  wire2.ut_metadata.on('warning', () => {
    t.pass('got warning because peer sent reject too much')
  })

  wire2.on('handshake', (infoHash, peerId, extensions) => {
    wire2.handshake(leavesMetadata.parsedTorrent.infoHash, id2)
  })

  wire1.handshake(leavesMetadata.parsedTorrent.infoHash, id1)
})

test('stop receiving data after cancel', t => {
  t.plan(1)

  const wire1 = new Protocol()
  const wire2 = new Protocol()

  wire1.pipe(wire2).pipe(wire1)

  wire1.use(utMetadata(sintel.torrent))
  wire2.use(utMetadata())

  wire2.ut_metadata.once('metadata', () => {
    t.fail('No "metadata" event should fire')
  })

  wire2.once('handshake', (infoHash, peerId, extensions) => {
    wire2.handshake(sintel.parsedTorrent.infoHash, id2)
    wire2.ut_metadata.fetch()
  })

  wire2.on('extended', ext => {
    if (ext === 'ut_metadata') {
      wire2.ut_metadata.cancel()
    }
  })

  wire1.handshake(sintel.parsedTorrent.infoHash, id1)

  process.nextTick(() => t.pass('no metadata received'))
})
