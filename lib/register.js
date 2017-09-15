/**
 * Created by Corey600 on 2017/9/12.
 */

'use strict';

// require core modules
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Constructor of Register.
 *
 * @param client // The Client instance of zookeeper.
 * @param path // The path of zookeeper node.
 * @returns {Register}
 * @constructor
 */
function Register(client, path) {
  if (!(this instanceof Register)) return new Register(client);
  EventEmitter.call(this);
  this._client = client;
  this._path = path;
  // Register status. Supported 'unwatched' / 'pending' / 'watched'.
  this._status = 'unwatched';

  this._watcher = this._watcher.bind(this);
}

// inherited functions
util.inherits(Register, EventEmitter);

/**
 * 是否没有注册监听
 *
 * @returns {boolean}
 */
Register.prototype.isUnwatched = function () {
  return ('unwatched' === this._status);
};

/**
 * 获取孩子节点
 *
 * @param cb
 */
Register.prototype.getChildren = function (cb) {
  var callback = cb || function () {};
  if (!this.isUnwatched()) {
    callback(new Error('The status of getChildren is '
      + this._status + ' from path: ' + this._path));
    return;
  }
  this._doGet(callback);
};

/**
 * 监听的回调
 *
 * @private
 */
Register.prototype._watcher = function (/* event */) {
  this._doGet();
};

/**
 * 获取孩子节点
 *
 * @param cb
 * @private
 */
Register.prototype._doGet = function (cb) {
  var self = this;
  this._status = 'pending';
  this._client.getChildren(this._path, this._watcher, function (err, children) {
    var callback = cb || function (e, uris) {
      if (e) self.emit('err', e);
      else self.emit('change', uris);
    };

    if (err) {
      self._status = 'unwatched';
      return callback(err);
    }

    self._status = 'watched';
    var uris = [];
    (children || []).forEach(function (item) {
      var uri = decodeURIComponent(item);
      uris.push(uri);
    });
    return callback(false, uris);
  });
};

/**
 * Expose `Register`.
 *
 * @type {Register}
 */
module.exports = Register;
