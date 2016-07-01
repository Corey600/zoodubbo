/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

// require core modules
var net = require('net');

// require thirdpart modules
var debug = require('debug');

// require custom modules
var Codec = require('./codec');

// print debug info
var error = debug('zoodubbo:error');

/**
 * Expose `Invoker`.
 *
 * @type {Invoker}
 */
module.exports = Invoker;

/**
 * Constructor of Invoker.
 *
 * @param {ZD} zd
 * @param {Object} opt
 * {
 *  path: String // The path of service node.
 *  version: String, // The version of service.
 *  timeout: Number, // Timeout in milliseconds, defaults to 60 seconds.
 * }
 * @returns {Invoker}
 * @constructor
 */
function Invoker(zd, opt) {
    if (!(this instanceof Invoker)) return new Invoker(zd, opt);
    this._zd = zd;
    opt = opt || {};
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
 * @param {String} method
 * @param {Array} args
 * @param {Function} [cb]
 * @public
 */
Invoker.prototype.excute = function (method, args, cb) {
    var self = this;
    if (typeof cb !== 'function') {
        return new Promise(function (resolve, reject) {
            try {
                self._excute(method, args, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(data);
                });
            } catch (err) {
                return reject(err);
            }
        });
    } else {
        try {
            return self._excute(method, args, cb);
        } catch (err) {
            return cb(err);
        }
    }
};

/**
 * Excute the method.
 *
 * @param {String} method
 * @param {Array} args
 * @param {Function} cb
 * @private
 */
Invoker.prototype._excute = function (method, args, cb) {
    var self = this;

    var codec = new Codec();
    var buffer = codec.encodeRequest(self, method, args);

    var fromCache = true;
    var tryConnectZoo = true;
    var _provider = self._zd.cache[self._path];
    if (_provider) {
        return fetchData(false, _provider);
    } else {
        fromCache = false;
        return self._zd.getProvider(self._path, self._version, fetchData);
    }

    function fetchData(err, provider) {
        if (err) {
            return cb(err);
        }

        var client = new net.Socket();
        codec.clearChunk();

        if (!~provider.methods.indexOf(method)) {
            if(fromCache){
                return handleReconnect();
            }else{
                return cb('Can\'t find the method:' + method + ', please check it!');
            }
        }

        client.connect(provider.port, provider.host, function () {
            client.write(buffer);
        });

        client.on('error', function (err) {
            error(err);
            if (tryConnectZoo) {
                tryConnectZoo = false;
                setTimeout(handleReconnect, 1000);
            }
        });

        client.on('data', function (chunk) {
            codec.pushChunk(chunk) && client.destroy();
        });

        client.on('close', function (err) {
            if (err) {
                return cb(err);
            }
            codec.decodeResponse(cb);
        });
    }

    function handleReconnect() {
        tryConnectZoo = true;
        fromCache = false;
        return self._zd.getProvider(self._path, self._version, fetchData);
    }
};
