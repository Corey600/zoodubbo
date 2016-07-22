/**
 * Created by feichenxi on 2016/6/24.
 */

'use strict';

// require thirdpart modules
var debug = require('debug');
var hessian = require('hessian.js');

// require custom modules
var response = require('./status');

// print debug info
var error = debug('zoodubbo:error');
var info = debug('zoodubbo:info');

/**
 * header length.
 *
 * @type {number}
 */
var HEADER_LENGTH = 16;

/**
 * magic header.
 *
 * @type {number}
 */
var MAGIC = 0xdabb;

/**
 * high 8bit of magic header.
 *
 * @type {number}
 */
var MAGIC_HIGH = MAGIC>>8;

/**
 * low 8bit of magic header.
 *
 * @type {number}
 */
var MAGIC_LOW = MAGIC & 0x00ff;

/**
 * message flag.
 *
 * @type {number}
 */
var FLAG_REQUEST = 0x80;
var FLAG_TWOWAY = 0x40;
var FLAG_EVENT = 0x20;

/**
 * serialization protocol flag mask.
 *
 * @type {number}
 */
var SERIALIZATION_MASK = 0x1f;

/**
 * dubbo 传输协议体 body 的最大长度
 * 协议允许的最大长度为 2^32-1 = 4294967296
 * 建议的最大长度为 100K = 100 * 1024 * 8 = 819200
 *
 * @type {number}
 */
var MAX_LENGTH = 819200;

/**
 * 基础类型定义
 *
 * @type {{
 *  boolean: string,
 *  int: string,
 *  short: string,
 *  long: string,
 *  double: string,
 *  float: string
 * }}
 */
var typeRef = {
    boolean: 'Z',
    int: 'I',
    short: 'S',
    long: 'J',
    double: 'D',
    float: 'F'
};

/**
 * Expose `Codec`.
 *
 * @type {Codec}
 */
module.exports = Codec;

/**
 * Constructor of Codec.
 *
 * @returns {Invoker}
 * @constructor
 */
function Codec() {
    this._chunks = [];
    this._heap = null;
    this._bl = 0;
}

/**
 * 以 dubbo传输协议 包装请求数据
 * 协议格式 <header><bodydata>
 * 传输协议参考文档：
 *     http://blog.csdn.net/quhongwei_zhanqiu/article/details/41702829
 *     http://dubbo.io/dubbo_protocol_header.jpg-version=1&modificationDate=1335251744000.jpg
 *
 * @param {Invoker} invoker
 * @param {String} method
 * @param {Array} args
 * @returns {Buffer}
 * @public
 */
Codec.prototype.encodeRequest = function (invoker, method, args) {
    var body = this._buildBody(invoker, method, args);
    var head = this._buildHead(body.length);
    return Buffer.concat([head, body]);
};

/**
 * 清楚所有添加的数据块
 *
 * @public
 */
Codec.prototype.clearChunk = function () {
    this._chunks = [];
};

/**
 * 添加一个数据块至末尾
 *
 * @param chunk
 * @returns {boolean}
 */
Codec.prototype.pushChunk = function (chunk) {
    var self = this;
    if (!self._chunks.length) {
        var arr = Array.prototype.slice.call(chunk.slice(0, HEADER_LENGTH));
        self._bl = self._parseLength(arr);
    }
    self._chunks.push(chunk);
    self._heap = Buffer.concat(self._chunks);
    return (self._heap.length >= self._bl) ;
};

/**
 * 解码返回数据
 *
 * @param {Function} cb
 * @returns {*}
 */
Codec.prototype.decodeResponse = function (cb) {
    return this._parseBody(this._heap, cb);
};

/**
 * 编码传输协议头 <header>
 * 协议头 定长 16个字节（128位）
 *  0 - 1B dubbo协议魔数(short) 固定为 0xda 0xbb
 *  2 - 2B 消息标志位
 *  3 - 3B 状态位
 *  4 -11B 设置消息的id long类型
 * 12 -15B 设置消息体body长度 int类型
 * -----------------------------------------------------------------------------------------------
 * | Bit offset |        0-7 |      8-15 |            16-20 |    21 |      22 |      23 |  24-31 |
 * -----------------------------------------------------------------------------------------------
 * |          0 | Magic High | Magic Low | Serialization id | event | Two way | Req/res | status |
 * -----------------------------------------------------------------------------------------------
 * |      32-95 | id (long)                                                                      |
 * -----------------------------------------------------------------------------------------------
 * |     96-127 | data length                                                                    |
 * -----------------------------------------------------------------------------------------------
 *
 * @param {Number} length 长度
 * @returns {Buffer}
 * @private
 */
Codec.prototype._buildHead = function (length) {
    var head = [0xda, 0xbb, 0xc2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var i = 15;
    if (length > MAX_LENGTH) {
        throw new Error('Data length too large: ' + length + ', max payload: ' + MAX_LENGTH);
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
 *  1. dubbo的版本信息
 *  2. 服务接口名
 *  3. 服务的版本号
 *  4. 调服务的方法名
 *  5. 调服务的方法的参数描述符
 *  6. 遍历传输的参数值逐个序列化
 *  7. 将整个附属信息map对象attachments序列化
 *
 * @param {Invoker} invoker
 * @param {String} method
 * @param {Array} args
 * @returns {Buffer}
 * @private
 */
Codec.prototype._buildBody = function (invoker, method, args) {
    var encoder = new hessian.EncoderV2();

    encoder.write(invoker._zd._dubbo);
    encoder.write(invoker._path);
    encoder.write(invoker._version);
    encoder.write(method);

    var index;
    var len = args.length;

    // 调服务的方法的参数描述符
    var type;
    var _paramTypes = '';
    if (args && len) {
        for (index = 0; index < len; index++) {
            type = args[index]['$class'];
            _paramTypes += type && ~type.indexOf('.')
                ? 'L' + type.replace(/\./gi, '/') + ';'
                : typeRef[type];
        }
    }
    encoder.write(_paramTypes);

    // 遍历传输的参数值逐个序列化
    if (args && len) {
        for (index = 0; index < len; index++) {
            encoder.write(args[index]);
        }
    }

    // 将整个附属信息map对象attachments序列化
    encoder.write(invoker._attchments);

    var byteBuffer = encoder.byteBuffer;
    byteBuffer = byteBuffer.get(0, encoder.byteBuffer._offset);
    return byteBuffer;
};

/**
 * 解码协议头，获取数据体长度
 *
 * @param {Array} head
 * @returns {number}
 * @private
 */
Codec.prototype._parseLength = function (head) {
    var length = HEADER_LENGTH;
    var ans = 1;
    // head的最后4B数据表示长度, 16581375 = 255^3
    while (ans <= 16581375) {
        var item = head.pop();
        if (item > 0) {
            length += item * ans;
        }
        ans *= 256;
    }
    return length;
};

/**
 * 解码协议体
 *
 * @param {Buffer} heap
 * @param {Function} cb
 * @returns {*}
 * @private
 */
Codec.prototype._parseBody = function (heap, cb) {
    // 检验魔数
    if(heap[0] !== MAGIC_HIGH || heap[1] !== MAGIC_LOW){
        return cb('Magic header is wrong!');
    }

    // 检查序列化协议
    if((heap[2] & SERIALIZATION_MASK)!=2){ // hessian2 的协议ID为 2
        return cb('Unknown serialization protocol! Only hessian2 is supported.');
    }

    // 打印标志位
    info('FLAG_REQUEST:' + (heap[2] & FLAG_REQUEST) +
        ', FLAG_TWOWAY:' + (heap[2] & FLAG_REQUEST) +
        ', FLAG_EVENT:' + (heap[2] & FLAG_EVENT));

    if (heap[3] !== response.CODE.OK) {
        // error捕获
        return cb(decodeURIComponent(heap.slice(HEADER_LENGTH + 2, heap.length-1).toString()));
    }

    var buf, flag, ret;
    try {
        // 反序列化
        buf = new hessian.DecoderV2(heap.slice(HEADER_LENGTH, heap.length));

        // 结果标志位为数据段第一个字节，为 0x90 0x91 0x92其中之一
        // 实际为hessian协议的简化整数表示，反序列化后为： 0 1 2
        // RESPONSE_WITH_EXCEPTION = 0;
        // RESPONSE_VALUE = 1;
        // RESPONSE_NULL_VALUE = 2;
        flag = buf.readInt();
    } catch (err) {
        return cb(err);
    }

    info('flag: ' + flag);
    if(flag === 2){ // 无返回值
        return cb(false);
    }

    try{
        ret = buf.read();
    }catch(err){
        return cb(err);
    }

    if (ret instanceof Error || flag === 0) {
        return cb(ret);
    }
    return cb(false, ret);
};
