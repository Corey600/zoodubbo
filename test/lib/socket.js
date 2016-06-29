/**
 * Created by Corey600 on 2016/6/18.
 */

const util = require('util');
const EventEmitter = require('events').EventEmitter;

var retrys = 1;

function MySocket() {
    this._buffer = null;
    EventEmitter.call(this);
}

util.inherits(MySocket, EventEmitter);

MySocket.prototype.connect = function(port, host, cb){
    setTimeout(function(){ cb();}, 50);
};

MySocket.prototype.write = function(buffer){
    var self = this;
    this._buffer = buffer;
    if(retrys>0){
        this.emit('error', 'test error!');
        retrys--;
    }else{
        setTimeout(function(){
            self.emit('data', new Buffer([0xda, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x92]));
        }, 50);
    }
};

MySocket.prototype.destroy = function(){
    this.emit('close');
};

module.exports = MySocket;
