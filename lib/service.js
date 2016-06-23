/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

var net = require('net');
var debug = require('debug');
var hessian = require('hessian.js');

var response = require('./response');

var error = debug('zoodubbo:error');
var info = debug('zoodubbo:info');

// header length.
var HEADER_LENGTH = 16;

// magic header.
var MAGIC = 0xdabb;

var MAGIC_HIGH = MAGIC>>8;

var MAGIC_LOW = MAGIC & 0x00ff;

// message flag.
var FLAG_REQUEST = 0x80;

var FLAG_TWOWAY = 0x40;

var FLAG_EVENT = 0x20;

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
 * Create a Service instance
 *
 * @param {ZD} zd ZD实例
 * @param {Object} opt 参数
 * @returns {Service}
 * @constructor
 */
function Service(zd, opt) {
    if (!(this instanceof Service)) return new Service(zd, opt);
    this._zd = zd;

    this._path = opt.path;
    this._version = opt.version;
    this._timeout = (opt.timeout || '60000') + '';

    this._attchments = {
        $class: 'java.util.HashMap',
        $: {
            'path': this._path,
            'interface': this._path,
            'timeout': this._timeout,
            'version': this._version
        }
    };
}

/**
 * Excute the method
 *
 * @param {String} method 方法名
 * @param {Array} args 参数列表
 * @param {Function|null} cb 回调函数
 * @public
 */
Service.prototype.excute = function (method, args, cb) {
    var self = this;
    if (typeof cb !== 'function') {
        return new Promise(function (resolve, reject) {
            try {
                self._excute(method, args, function (error, data) {
                    if (error) {
                        return reject(error);
                    }
                    return resolve(data);
                });
            } catch (error) {
                reject(error);
            }
        });
    } else {
        return self._excute(method, args, cb);
    }
};

/**
 * Excute the method
 *
 * @param {String} method 方法名
 * @param {Array} args 参数列表
 * @param {Function} cb 回调函数
 * @private
 */
Service.prototype._excute = function (method, args, cb) {
    var self = this;

    var _method = method;
    var _buffer = self._buildBuffer(method, args);

    var fromCache = true;
    var tryConnectZoo = true;
    var zoo = self._zd.getZooFromCache(self._path);
    if (zoo) {
        return fetchData(null, zoo);
    } else {
        fromCache = false;
        return self._zd.getZooFromClient(self._path, self._version, fetchData);
    }

    function fetchData(err, zoo) {
        if (err) {
            return cb(err);
        }

        var client = new net.Socket();
        var bl = 16;
        var host = zoo.host;
        var port = zoo.port;
        var chunks = [];
        var heap;

        if (!~zoo.methods.indexOf(_method) && !fromCache) {
            return cb('can\'t find the method:' + _method + ', please check it!');
        }

        client.connect(port, host, function () {
            client.write(_buffer);
        });

        client.on('error', function (err) {
            error(err);
            if (tryConnectZoo) {
                // 2s duration reconnect
                tryConnectZoo = false;
                setTimeout(handleReconnect, 2000);
            }
        });

        client.on('data', function (chunk) {
            if (!chunks.length) {
                var arr = Array.prototype.slice.call(chunk.slice(0, 16));
                bl = self._parseLength(arr);
            }
            chunks.push(chunk);
            heap = Buffer.concat(chunks);
            (heap.length >= bl) && client.destroy();
        });

        client.on('close', function (err) {
            if (err) {
                error('some err happened, so reconnect, check the err event');
                return cb(err);
            }
            try {
                self._parseBody(heap, cb);
            } catch (err) {
                cb(err);
            }
        });
    }

    function handleReconnect() {
        tryConnectZoo = true;
        fromCache = false;
        // reconnect when err occur
        return self._zk.getZooFromClient(self._group, self._path, fetchData);
    }
};

/**
 * 以 dubbo传输协议 包装数据
 * 协议格式 <header><bodydata>
 * 传输协议参考文档：
 *     http://blog.csdn.net/quhongwei_zhanqiu/article/details/41702829
 *     http://dubbo.io/dubbo_protocol_header.jpg-version=1&modificationDate=1335251744000.jpg
 *
 * @param {String} method 方法名
 * @param {Array} args 参数列表
 * @returns {Buffer}
 * @private
 */
Service.prototype._buildBuffer = function (method, args) {
    var body = this._serializeBody(method, args);
    var head = this._codecHead(body.length);
    return Buffer.concat([head, body]);
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
Service.prototype._codecHead = function (length) {
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
 * @param {String} method 方法名
 * @param {Array} args 参数列表
 * @returns {Buffer}
 * @private
 */
Service.prototype._serializeBody = function (method, args) {
    var encoder = new hessian.EncoderV2();

    encoder.write(this._zd._dubbo);
    encoder.write(this._path);
    encoder.write(this._version);
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
    encoder.write(this._attchments);

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
Service.prototype._parseLength = function (head) {
    var length = 16;
    var ans = 1;
    // head的最后4B数据表示长度, 16581375 = 255^3
    while (ans <= 16581375) {
        var item = head.pop();
        if (item > 0) {
            length += item * ans;
        }
        ans *= 255;
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
Service.prototype._parseBody = function (heap, cb) {
    // 检验魔数
    if(heap[0] !== MAGIC_HIGH || heap[1] !== MAGIC_LOW){
        cb('Magic header is wrong!');
    }

    // 检查序列化协议
    if((heap[2] & SERIALIZATION_MASK)!=2){ // hessian2 的协议ID为 2
        cb('Unknown serialization protocol!');
    }

    // 打印标志位
    info('FLAG_REQUEST:' + (heap[2] & FLAG_REQUEST) +
        ', FLAG_TWOWAY:' + (heap[2] & FLAG_REQUEST) +
        ', FLAG_EVENT:' + (heap[2] & FLAG_EVENT));

    if (heap[3] !== response.CODE.OK) {
        // error捕获
        return cb(decodeURIComponent(heap.slice(18, heap.length-1).toString()));
    }

    try {
        // 反序列化
        var buf = new hessian.DecoderV2(heap.slice(16, heap.length));

        // 结果标志位为数据段第一个字节，为 0x90 0x91 0x92其中之一
        // 实际为hessian协议的简化整数表示，反序列化后为： 0 1 2
        // RESPONSE_WITH_EXCEPTION = 0;
        // RESPONSE_VALUE = 1;
        // RESPONSE_NULL_VALUE = 2;
        var flag = buf.readInt();
        info('flag:' + flag);
        if(flag == 2){
            return cb(null);
        }
        var _ret = buf.read();
        if (_ret instanceof Error || flag === 0) {
            return cb(_ret);
        }
        return cb(null, JSON.stringify(_ret));
    } catch (err) {
        return cb(err);
    }
};

module.exports = Service;
