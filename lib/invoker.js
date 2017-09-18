/**
 * Created by Corey600 on 2016/6/15.
 */

'use strict';

// require core modules
var url = require('url');
var querystring = require('querystring');

// require thirdpart modules
var debug = require('debug');

// require custom modules
var createPool = require('./pool');
var Codec = require('./codec');
var Register = require('./register');
var RandomLoadBalance = require('./loadbalance/RandomLoadBalance');

// print debug info
var error = debug('zoodubbo:error');
var warn = debug('zoodubbo:warn');

/**
 * Constructor of Invoker.
 *
 * @param {Client|String|Array} zk // The ZD instance or the uri of providers.
 * @param {Object} opt
 * {
 *  path: String // The path of service node.
 *  version: String, // The version of service.
 *  timeout: Number, // Timeout in milliseconds, defaults to 60 seconds.
 * }
 * @returns {Invoker}
 * @constructor
 */
function Invoker(zk, opt) {
  if (!(this instanceof Invoker)) return new Invoker(zk, opt);

  var option = opt || {};
  this._path = option.path;
  this._dubbo = option.dubbo;
  this._version = option.version;
  this._timeout = option.timeout;
  this._poolMax = option.poolMax;
  this._poolMin = option.poolMin;

  this._providers = null; // Array
  this._configurators = null; // Object
  this._loadBalance = new RandomLoadBalance();

  this._parseProviders = this._parseProviders.bind(this);
  this._parseConfigurators = this._parseConfigurators.bind(this);

  if ('string' === typeof zk) {
    this._uris = [zk];
  } else if (Array.isArray(zk)) {
    this._uris = zk;
  } else if (zk) {
    this._registerProviders = new Register(zk, '/dubbo/' + this._path + '/providers');
    this._registerConfigurators = new Register(zk, '/dubbo/' + this._path + '/configurators');
    this._registerProviders.on('change', this._parseProviders);
    this._registerConfigurators.on('change', this._parseConfigurators);
  }
}

/**
 * Excute the method
 *
 * @param {String} method
 * @param {Array|Object} args
 * {
 *  args: Array
 *  timeout: number
 * }
 * @param {Function} [cb]
 * @public
 */
Invoker.prototype.excute = function (method, args, cb) {
  var option = args;
  if (Array.isArray(option)) {
    option = { args: option };
  }
  option.method = method;

  var self = this;
  if ('function' !== typeof cb) {
    return new Promise(function (resolve, reject) {
      try {
        return self._excute(option, function (err, data) {
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
    return self._excute(option, cb);
  } catch (err) {
    return cb(err);
  }
};

/**
 * Excute the method.
 *
 * @param option
 * {
 *  method: String
 *  args: Array
 *  timeout: number
 * }
 * @param {Function} cb
 * @private
 */
Invoker.prototype._excute = function (option, cb) {
  var self = this;
  var method = option.method;
  var args = option.args;
  var reConnect = false;
  var codec = new Codec();

  var fetchData = function (err, provider) {
    if (err) {
      cb(err);
      return;
    }

    if (!~provider.methods.indexOf(method)) {
      cb(new Error('Can\'t find the method:' + method
        + ' form provider: ' + provider.host + ':' + provider.port
        + ', please check it!'));
      return;
    }

    var pool = provider.pool;
    var buffer = codec.encodeRequest(self, provider, method, args);

    var resource = pool.acquire();
    resource.then(function (client) {
      client.once('error', function (e) {
        error(err);
        client.removeAllListeners('data');
        pool.release(client);

        if (!reConnect) {
          reConnect = true;
          setTimeout(function () {
            self._getChildren(fetchData);
          }, 1000);
        } else {
          cb(e);
        }
      });

      client.on('data', function (chunk) {
        if (codec.pushChunk(chunk)) {
          client.removeAllListeners('data');
          pool.release(client);
          codec.decodeResponse(cb);
        }
      });

      codec.clearChunk();
      client.write(buffer);
    }).catch(function (e) {
      cb(e);
    });
  };

  return self._getChildren(fetchData);
};

/**
 * 获取注册中心 Providers 和 Configurators 信息
 *
 * @param cb
 * @private
 */
Invoker.prototype._getChildren = function (cb) {
  var self = this;
  Promise.all([
    this._getProviders(),
    this._getConfigurators()
  ])
    .then(function () {
      if (!self._providers || 0 >= self._providers.length) {
        throw new Error('Can\'t find children from the node: ' + self._path +
          ' ,please check the path!');
      }

      var providers = [];
      self._providers.forEach(function (item) {
        var configurator = self._configurators[item.host + ':' + item.port];
        providers.push(Object.assign({}, item, configurator));
      });

      var provider;
      provider = self._loadBalance.select(providers);
      if (!provider.pool) {
        provider.pool = createPool(provider.host, provider.port, {
          max: self._poolMax,
          min: self._poolMin
        });
      }

      cb(false, provider);
    })
    .catch(function (err) {
      cb(err);
    });
};

/**
 * 获取注册中心 Providers 信息
 *
 * @returns {Promise}
 * @private
 */
Invoker.prototype._getProviders = function () {
  var self = this;
  return new Promise(function (resolve, reject) {
    if (self._uris) {
      self._parseProviders(self._uris);
      self._uris = null;
    }
    if (self._registerProviders && self._registerProviders.isUnwatched()) {
      self._registerProviders.getChildren(function (err, uris) {
        if (err) return reject(err);
        var providers;
        try {
          providers = self._parseProviders(uris);
        } catch (e) {
          return reject(e);
        }
        return resolve(providers);
      });
    } else {
      resolve(self._providers);
    }
  });
};

/**
 * 获取注册中心 Configurators 信息
 *
 * @returns {Promise}
 * @private
 */
Invoker.prototype._getConfigurators = function () {
  var self = this;
  return new Promise(function (resolve, reject) {
    if (self._registerConfigurators && self._registerConfigurators.isUnwatched()) {
      self._registerConfigurators.getChildren(function (err, uris) {
        if (err) return reject(err);
        var configurators;
        try {
          configurators = self._parseConfigurators(uris);
        } catch (e) {
          return reject(e);
        }
        return resolve(configurators);
      });
    } else {
      resolve(self._configurators);
    }
  });
};

/**
 * 解析 Providers 的 URIs
 *
 * @param uris
 * @returns {Array}
 * @private
 */
Invoker.prototype._parseProviders = function (uris) {
  var self = this;
  var providers = [];
  (uris || []).forEach(function (uri) {
    var provider;
    try {
      var parsed = url.parse(uri);
      provider = querystring.parse(parsed.query);
      provider.methods = provider.methods.split(',');
      provider.host = parsed.hostname;
      if (parsed.port) provider.port = parseInt(parsed.port, 10);
      if (provider.weight) provider.weight = parseInt(provider.weight, 10);
      if (provider.warmup) provider.warmup = parseInt(provider.warmup, 10);
      if (provider.timestamp) provider.timestamp = parseInt(provider.timestamp, 10);

      (self._providers || []).forEach(function (item) {
        if (item.host === provider.host && item.port === provider.port) {
          provider.pool = item.pool;
        } else if (item.pool) {
          item.pool.drain().then(function () {
            item.pool.clear();
          });
        }
      });
    } catch (err) {
      warn('Parse children of providers error. uri: ' + uri);
      return;
    }
    providers.push(provider);
  });
  self._providers = providers;
  return providers;
};

/**
 * 解析 Configurators 的 URIs
 *
 * @param uris
 * @returns {Object}
 * @private
 */
Invoker.prototype._parseConfigurators = function (uris) {
  var configurators = {};
  (uris || []).forEach(function (uri) {
    var configurator;
    try {
      var parsed = url.parse(uri);
      configurator = querystring.parse(parsed.query);
      configurator.host = parsed.hostname;
      if (parsed.port) configurator.port = parseInt(parsed.port, 10);
      if (configurator.weight) configurator.weight = parseInt(configurator.weight, 10);
      if (!configurator.enabled || 'false' === configurator.enabled) return;
    } catch (err) {
      warn('Parse children of configurators error. uri: ' + uri);
      return;
    }
    configurators[configurator.host + ':' + configurator.port] = configurator;
  });
  this._configurators = configurators;
  return configurators;
};

/**
 * Expose `Invoker`.
 *
 * @type {Invoker}
 */
module.exports = Invoker;
