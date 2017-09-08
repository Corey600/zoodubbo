/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

// require core modules
var url = require('url');
var querystring = require('querystring');

// require thirdpart modules
var zookeeper = require('node-zookeeper-client');

// require custom modules
var Invoker = require('./lib/invoker');

/**
 * Constructor of ZD.
 *
 * @param {Object} conf
 * {
 *  dubbo: String // dubbo version information
 *
 *  // The following content could reference:
 *  //     https://github.com/alexguan/node-zookeeper-client#client-createclientconnectionstring-options
 *
 *  conn: String, // Comma separated host:port pairs, each represents a ZooKeeper server
 *  sessionTimeout: Number, // Session timeout in milliseconds, defaults to 30 seconds.
 *  spinDelay: Number, // The delay (in milliseconds) between each connection attempts.
 *  retries: Number // The number of retry attempts for connection loss exception.
 * }
 * @returns {ZD}
 * @constructor
 */
function ZD(conf) {
  if (!(this instanceof ZD)) return new ZD(conf);
  var config = conf || {};
  this._dubbo = config.dubbo;
  this._conn = config.conn;
  this._client = zookeeper.createClient(this._conn, {
    sessionTimeout: config.sessionTimeout,
    spinDelay: config.spinDelay,
    retries: config.retries
  });
  this.client = this._client;

  this._cache = {};
  this.cache = this._cache;
}

/**
 * Connect zookeeper.
 *
 * @public
 */
ZD.prototype.connect = function () {
  if (!this._client || !this._client.connect) {
    return;
  }
  this._client.connect();
};

/**
 * Close connection.
 *
 * @public
 */
ZD.prototype.close = function () {
  if (!this._client || !this._client.close) {
    return;
  }
  this._client.close();
};

/**
 * Get a invoker.
 *
 * @param {String} path
 * @param {Object} [opt]
 * {
 *  version: String
 *  timeout: Number
 * }
 * @returns {Invoker}
 * @public
 */
ZD.prototype.getInvoker = function (path, opt) {
  var option = opt || {};
  return new Invoker(this, {
    path: path,
    timeout: option.timeout,
    version: (option.version || '0.0.0').toUpperCase()
  });
};

/**
 * Get a provider from the registry.
 *
 * @param {String} path
 * @param {String} version
 * @param {Function} cb
 * @returns {*}
 * @public
 */
ZD.prototype.getProvider = function (path, version, cb) {
  var self = this;
  var _path = '/dubbo/' + path + '/providers';
  return self._client.getChildren(_path, function (err, children) {
    var child;
    var parsed;
    var provider;
    var i;
    var l;
    if (err) {
      return cb(err);
    }

    if (children && !children.length) {
      return cb('Can\'t find children from the node: ' + _path +
          ' ,please check the path!');
    }

    try {
      for (i = 0, l = children.length; i < l; i += 1) {
        child = querystring.parse(decodeURIComponent(children[i]));
        // console.log(child);
        if (child.version === version) {
          break;
        }
      }

      parsed = url.parse(Object.keys(child)[0]);
      provider = {
        host: parsed.hostname,
        port: parsed.port,
        methods: child.methods.split(',')
      };
      self._cache[path] = provider;
    } catch (e) {
      return cb(e);
    }

    return cb(false, provider);
  });
};

/**
 * Expose `ZD`.
 *
 * @type {ZD}
 */
module.exports = ZD;
