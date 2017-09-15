/**
 * Created by Corey600 on 2016/6/18.
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Buffer = require('safe-buffer').Buffer;

var retrys = 1;

function MySocket() {
  EventEmitter.call(this);
}

util.inherits(MySocket, EventEmitter);

MySocket.prototype.connect = function (port, host, cb) {
  this.on('connect', cb);
  var self = this;
  setImmediate(function () {
    self.emit('connect');
  });
};

MySocket.prototype.write = function (/* buffer */) {
  var self = this;
  if (0 < retrys) {
    retrys -= 1;
    setImmediate(function () {
      self.emit('error', new Error('Socket Test Error!'));
    });
    return;
  }
  setImmediate(function () {
    self.emit('data', new Buffer([0xda, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x92]));
  });
};

MySocket.prototype.destroy = function () {
  setImmediate(function () {
    this.emit('close');
  });
};

module.exports = MySocket;
