/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

var hessian = require('hessian.js');

/**
 * dubbo 传输协议体 body 的最大长度
 * @type {number}
 */
var MAX_LENGTH = 4294967296; // 2^32-1

var typeRef = {
    boolean: 'Z',
    int:     'I',
    short:   'S',
    long:    'J',
    double:  'D',
    float:   'F'
};

/**
 * Create a Service instance
 *
 * @param {ZD} zd
 * @param {String} path
 * @returns {Service}
 * @constructor
 */
function Service(zd, path){
    if (!(this instanceof Service)) return new Service(zd, path);
    this._zd = zd;
    this._path = path;
}

/**
 *
 * @param {String} method
 * @param {Array }args
 * @param {Function} cb
 * @public
 */
Service.prototype.excute = function(method, args, cb){
    var self = this;

    var _method         = method;
    var _parameterTypes = '';
    var _arguments      = args;

    if (_arguments.length) {
        for (var i = 0, l = _arguments.length; i < l; i++) {
            type = _arguments[i]['$class'];
            _parameterTypes += type && ~type.indexOf('.')
                ? 'L' + type.replace(/\./gi, '/') + ';'
                : typeRef[type];
        }
        buffer = this.buffer(_method, _parameterTypes, _arguments);
    } else {
        buffer = this.buffer(_method, '');
    }

    self._zd.getZoo(self._path, function(error, zoo){

    });

};

/**
 * 以 dubbo 传输协议 序列化数据
 * 协议格式 <header><bodydata>
 * 传输协议参开文档：
 *     http://blog.csdn.net/quhongwei_zhanqiu/article/details/41702829
 *
 * @param method
 * @param type
 * @param args
 * @returns {Buffer}
 */
Service.prototype.serializeBuffer = function(method, type, args){
    var bufferBody = this.serializeHead(method, type, args);
    var bufferHead = this.serializeBody(bufferBody.length);
    return Buffer.concat([bufferHead, bufferBody]);
};

/**
 * 序列化传输协议头 <header>
 * 协议头 定长 16个字节（128位）
 * 0-1B dubbo协议魔数(short) 固定为 0xda 0xbb
 * 2-2B 消息标志位，用来表示消息是request还是//response,twoway还是oneway,是心跳还是正常请求以及采用//的序列化反序列化协议
 * 3-3B 状态位， 消息类型为response时，设置请求响应状态
 * 4-11B 设置消息的id long类型
 * 12-16B 设置消息体body长度 int类型
 *
 * @param length
 * @returns {Buffer}
 */
Service.prototype.serializeHead = function(length){
    var head = [0xda, 0xbb, 0xc2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var i = 15;
    if (length > MAX_LENGTH) {
        throw new Error(`Data length too large: ${length}, max payload: ${MAX_LENGTH}`);
    }
    while (256 <= length) {
        head.splice(i--, 1, length % 256);
        length = length >> 8;
    }
    head.splice(i, 1, length);
    return new Buffer(head);
};

/**
 * 序列化传输协议体 <bodydata>
 * @returns {*}
 */
Service.prototype.serializeBody = function(method, types, args){
    var encoder = new hessian.EncoderV2();
    encoder.write(this._dubboVersion);
    encoder.write(this._path);
    encoder.write(this._version);
    encoder.write(method);
    encoder.write(types);
    if (args && args.length) {
        for (var i = 0, len = args.length; i < len; ++i) {
            encoder.write(args[i]);
        }
    }
    encoder.write(this._attchments);
    encoder = encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);

    return encoder;
};

module.exports = Service;
