/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

var querystring = require('querystring');
var zookeeper = require('node-zookeeper-client');
var Service = require('./service');

/**
 * Create a ZD instance
 *
 * @param conn
 * @param opt
 * @returns {ZD}
 * @constructor
 */
function ZD(conn, opt){
    if (!(this instanceof ZD)) return new ZD(arguments);
    this._conn = conn;
    this._opt = opt;
    this._cache  = {};
}

/**
 * Connect zookeeper
 *
 * @param conn
 * @param opt
 * @public
 */
ZD.prototype.connect = function(conn, opt){
    var self = this;
    conn && (this._conn = conn);

    !opt && (opt = this._opt);
    this._opt = {
        sessionTimeout: opt.sessionTimeout || 30000,
        spinDelay     : opt.spinDelay || 1000,
        retries       : opt.retries || 5
    };

    // close old connection before new connection
    self.close();

    this._client = this.client = zookeeper.createClient(this._conn, this._opt);
    this._client.connect();
    this._client.once('connected', function connect() {
        console.log('\x1b[32m%s\x1b[0m', 'zookeeper connected.');
    });
};

/**
 * Close connect
 *
 * @public
 */
ZD.prototype.close = function(){
    if(!this._client || !this._client.close){
        return;
    }
    this._client.close();
};

/**
 * Get a service
 *
 * @param path
 * @returns {Server}
 * @public
 */
ZD.prototype.getService = function(path){
    var self = this;
    return new Server(self, path);
};

/**
 * Get a zoo
 *
 * @param path
 * @param cb
 * @returns {Server}
 * @public
 */
ZD.prototype.getZoo = function(path, cb){
    var self = this;
    var cache = self._cache[path];
    if(cache){
        cb(cache);
    }
    var _path = '/dubbo/' + path + '/providers';
    self.client.getChildren(_path, function(error, children){
        var zoo, urlParsed;
        if (error) {
            if (error.code === -4) {
                console.log(error);
            }
            return cb(error);
        }
        if (children && !children.length) {
            return cb(`can\'t find  the zoo: ${path} ,pls check dubbo service!`);
        }

        for (var i = 0, l = children.length; i < l; i++) {
            zoo = querystring.parse(decodeURIComponent(children[i]));
            if (zoo.version === self.env) {
                break;
            }
        }
        // Get the first zoo
        urlParsed    = url.parse(Object.keys(zoo)[0]);
        zoo          = {
            host: urlParsed.hostname,
            port: urlParsed.port,
            methods: zoo.methods.split(',')
        };
        self.cacheZoo(path, zoo);
        cb(null, zoo);
    });
};

module.exports = ZD;
