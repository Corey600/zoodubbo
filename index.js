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
 * Expose `ZD`.
 *
 * @type {ZD}
 */
module.exports = ZD;

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
    conf = conf || {};
    this._dubbo = conf.dubbo;
    this._conn = conf.conn;
    this._client = this.client = zookeeper.createClient(this._conn, {
        sessionTimeout: conf.sessionTimeout,
        spinDelay: conf.spinDelay,
        retries: conf.retries
    });

    this._cache = this.cache = {};
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
    opt = opt || {};
    return new Invoker(this, {
        path: path,
        timeout: opt.timeout,
        version: (opt.version || '0.0.0').toUpperCase()
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
        var child, parsed, provider, i, l;
        if (err) {
            return cb(err);
        }

        if (children && !children.length) {
            return cb('Can\'t find children from the node: ' + _path +
                ' ,please check the path!');
        }

        try {
            for (i = 0, l = children.length; i < l; i++) {
                child = querystring.parse(decodeURIComponent(children[i]));
                //console.log(child);
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
        } catch (err) {
            return cb(err);
        }

        return cb(false, provider);
    });
};
