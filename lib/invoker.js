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
  var option = opt || {};
  this._zd = zd;
  this._path = option.path;
  this._version = option.version;
  this._timeout = (option.timeout || '60000') + '';

  this._attchments = {
    $class: 'java.util.HashMap',
    $: {
      path: this._path,
      interface: this._path,
      timeout: this._timeout,
      version: this._version
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
  if ('function' !== typeof cb) {
    return new Promise(function (resolve, reject) {
      try {
        return self._excute(method, args, function (err, data) {
          if (err) {
            return reject(err);
          }
          return resolve(data);
        });
      } catch (err) {
        return reject(err);
      }
    });
  }
  try {
    return self._excute(method, args, cb);
  } catch (err) {
    return cb(err);
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

  var fetchData = function (e, provider) {
    if (e) {
      return cb(e);
    }

    var handleReconnect = function () {
      tryConnectZoo = true;
      fromCache = false;
      return self._zd.getProvider(self._path, self._version, fetchData);
    };

    var client = new net.Socket();
    codec.clearChunk();

    if (!~provider.methods.indexOf(method)) {
      if (fromCache) {
        return handleReconnect();
      }
      return cb('Can\'t find the method:' + method + ', please check it!');
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
      if (codec.pushChunk(chunk)) client.destroy();
    });

    client.on('close', function (err) {
      if (err) {
        return cb(err);
      }
      return codec.decodeResponse(cb);
    });

    return null;
  };

  var _provider = self._zd.cache[self._path];
  if (_provider) {
    return fetchData(false, _provider);
  }
  fromCache = false;
  return self._zd.getProvider(self._path, self._version, fetchData);
};

/**
 * Expose `Invoker`.
 *
 * @type {Invoker}
 */
module.exports = Invoker;
