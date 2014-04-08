var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var bncode = require('bncode');


inherits(ut_metadata, process.EventEmitter);
function ut_metadata(wire) {
    this.send = function(info, trailer) {
        var buf = bncode.encode(info);
        if (Buffer.isBuffer(trailer))
            buf = Buffer.concat(buf, trailer);
        wire.extended('ut_metadata', buf);
    };

    this.onExtendedHandshake = function(info) {
        this.metadataSize = info.metadata_size;
        if (info.m.ut_metadata) {
            this.emit('enabled', this.metadataSize);
        }
    };
    this.onMessage = function(buf) {
        var info;

        var decoder = new bncode.decoder();
        for(var i = 0; i < buf.length; i++) {
            decoder.decode(buf.slice(i, i + 1));
            try {
                info = decoder.result()[0];
                break;
            } catch (e) {
                if (e.message !== "not in consistent state. More bytes coming?")
                    throw e;
            }
        }

        var trailer = (i < buf.length) &&
            buf.slice(i + 1);
        this._onMessage(info, trailer);
    }.bind(this);
}
module.exports = ut_metadata;

ut_metadata.prototype.chunkSize = 16384;

ut_metadata.prototype._onMessage = function(info, trailer) {
    switch(info.msg_type) {
    case 0:
        this.emit('request', info);
        break;
    case 1:
        this.emit('data', info, trailer);
        break;
    case 2:
        this.emit('reject', info);
        break;
    }
};

ut_metadata.prototype.request = function(piece) {
    this.send({
        msg_type: 0,
        piece: piece
    });
};

ut_metadata.prototype.data = function(piece, buf, totalSize) {
    var msg = {
        msg_type: 1,
        piece: piece
    };
    if (typeof totalSize === 'number') {
        msg.total_size = totalSize;
    }
    this.send(msg, buf);
};

ut_metadata.prototype.reject = function(piece) {
    this.send({
        msg_type: 2,
        piece: piece
    });
};
