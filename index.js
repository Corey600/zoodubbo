/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

// require thirdpart modules
var zookeeper = require('node-zookeeper-client');

// require custom modules
var Invoker = require('./lib/invoker');

/**
 * Constructor of ZD.
 *
 * @param {String|Object} conf // A String of host:port pairs or an object to set options.
 * {
 *  dubbo: String // Dubbo version information.
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
  var config = ('string' === typeof conf) ? { conn: conf } : (conf || {});
  this.dubbo = config.dubbo;
  this.client = zookeeper.createClient(config.conn, {
    sessionTimeout: config.sessionTimeout,
    spinDelay: config.spinDelay,
    retries: config.retries
  });
}

/**
 * Connect zookeeper.
 *
 * @public
 */
ZD.prototype.connect = function () {
  if (!this.client || !this.client.connect) {
    return;
  }
  this.client.connect();
};

/**
 * Close connection.
 *
 * @public
 */
ZD.prototype.close = function () {
  if (!this.client || !this.client.close) {
    return;
  }
  this.client.close();
};

/**
 * Get a invoker.
 *
 * @param {String} path
 * @param {Object} [opt]
 * {
 *  version: String
 *  timeout: Number
 *  poolMax: Number
 *  poolMin: Number
 * }
 * @returns {Invoker}
 * @public
 */
ZD.prototype.getInvoker = function (path, opt) {
  var self = this;
  var option = opt || {};
  return new Invoker(self.client, {
    path: path,
    dubbo: self.dubbo,
    timeout: option.timeout,
    version: option.version,
    poolMax: option.poolMax,
    poolMin: option.poolMin
  });
};

/**
 * Expose `Invoker`. To create a Invoker with URIs directly.
 * @type {Invoker}
 */
ZD.Invoker = Invoker;

/**
 * Expose `ZD`.
 *
 * @type {ZD}
 */
module.exports = ZD;
