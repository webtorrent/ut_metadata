var MetadataDownload = require('..').Data;
var test = require('tape')
var fs = require('fs');
var crypto = require('crypto');
var bncode = require('bncode');

function sha1(buf) {
    var hash = crypto.createHash('sha1');
    hash.update(buf);
    return hash.digest('hex');
}

var torrent = bncode.decode(fs.readFileSync(__dirname + "/data/Moby - Innocents.torrent"));
var info = torrent.info;
var infoBuf = bncode.encode(torrent.info);
var infoHash = sha1(infoBuf);

var PIECE_SIZE = 16384;

// test('seeds existing info', function (t) {
//   t.plan(0);
// });

test('leeches info', function (t) {
  t.plan(3);

  var swarm = new process.EventEmitter();
  var metadata = new MetadataDownload(infoHash, swarm);
  t.equal(metadata.complete, false);

  var wire = new process.EventEmitter();
  metadata.on('complete', function(completeInfo) {
      t.deepEquals(completeInfo, info, 'Info dictionaries match');
      t.equal(metadata.complete, true);
  });
  wire.extended = function(ext, buf) {
      if (ext === 'ut_metadata') {
          var msg = bncode.decode(buf);
          var index = msg.piece;
          var offset = index * PIECE_SIZE;
          var buf = Buffer.concat([
              bncode.encode({
                  msg_type: 1,
                  piece: index
              }),
              infoBuf.slice(offset, offset + PIECE_SIZE)
          ]);
          wire.emit('extended', 'ut_metadata', buf);
      }
  };
  swarm.emit('wire', wire);

  wire.emit('extended', 'handshake', {
      m: {
          ut_metadata: 1
      },
      metadata_size: infoBuf.length
  }, new Buffer([]));
});
