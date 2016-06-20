/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

var url = require('url');
var querystring = require('querystring');
var zookeeper = require('node-zookeeper-client');
var debug = require('debug');
var Service = require('./service');

var error = debug('zoodubbo:error');

/**
 * Create a ZD instance
 *
 * @param {Object} conf
 * {
 *  dubbo: string // dubbo version information
 *
 *  // The following content could reference:
 *  //     https://github.com/alexguan/node-zookeeper-client#client-createclientconnectionstring-options
 *
 *  conn: string, // Comma separated host:port pairs, each represents a ZooKeeper server
 *  sessionTimeout: Number, // Session timeout in milliseconds, defaults to 30 seconds.
 *  spinDelay: Number, // The delay (in milliseconds) between each connection attempts.
 *  retries: Number // The number of retry attempts for connection loss exception.
 * }
 * @returns {ZD}
 * @constructor
 */
function ZD(conf) {
    if (!(this instanceof ZD)) return new ZD(conf);
    this._dubbo = conf.dubbo;
    this._conn = conf.conn;
    this._opt = {
        sessionTimeout: conf.sessionTimeout || 30000,
        spinDelay: conf.spinDelay || 1000,
        retries: conf.retries || 5
    };
    this._cache = {};
}

/**
 * Connect zookeeper
 *
 * @param conn
 * @public
 */
ZD.prototype.connect = function (conn) {
    var self = this;
    conn && (self._conn = conn);

    // close old connection before new connection
    self.close();

    self._client = self.client = zookeeper.createClient(self._conn, self._opt);
    self._client.connect();
};

/**
 * Close connection
 *
 * @public
 */
ZD.prototype.close = function () {
    var self = this;
    if (!self._client || !self._client.close) {
        return;
    }
    var state = self._client.getState();
    if (state == zookeeper.State.CONNECTED
        || state == zookeeper.State.CONNECTED_READ_ONLY) {
        this._client.close();
    }
};

/**
 * Get a service
 *
 * @param path
 * @param opt
 * {
 *  version: string // service version
 *  timeout: number
 * }
 * @returns {Service}
 * @public
 */
ZD.prototype.getService = function (path, opt) {
    var self = this;
    opt = opt || {};
    return new Service(self, {
        path: path,
        timeout: opt.timeout,
        version: (opt.version || '0.0.0').toUpperCase()
    });
};

/**
 * Get a zoo from client
 *
 * @param path
 * @param version
 * @param cb
 * @returns {*}
 * @public
 */
ZD.prototype.getZooFromClient = function (path, version, cb) {
    var self = this;
    var _path = '/dubbo/' + path + '/providers';
    self.client.getChildren(_path, function (error, children) {
        var zoo, parsed;
        if (error) {
            if (error.getCode() === zookeeper.Exception.CONNECTION_LOSS) {
                error(error);
            }
            return cb(error);
        }
        if (children && !children.length) {
            return cb('can\'t find  the zoo: ' + path + ' ,please check dubbo service!');
        }

        for (var i = 0, l = children.length; i < l; i++) {
            zoo = querystring.parse(decodeURIComponent(children[i]));
            if (zoo.version === version) {
                break;
            }
        }
        // Get the first zoo
        parsed = url.parse(Object.keys(zoo)[0]);
        zoo = {
            host: parsed.hostname,
            port: parsed.port,
            methods: zoo.methods.split(',')
        };
        self._cache[path] = zoo;
        cb(null, zoo);
    });
};

/**
 * Get a zoo from cache
 *
 * @param path
 * @returns {*}
 * @public
 */
ZD.prototype.getZooFromCache = function (path) {
    var self = this;
    return self._cache[path];
};

module.exports = ZD;
