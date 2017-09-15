/**
 * Created by Corey600 on 2017/9/9.
 */

// require core modules
var net = require('net');

// require thirdpart modules
var debug = require('debug');
var genericPool = require('generic-pool');

// print debug info
var error = debug('zoodubbo:error');

/**
 * 创建线程池
 *
 * @param host 主机地址
 * @param port 主机端口
 * @param opts 选项
 * @returns {Pool}
 */
module.exports = function (host, port, opts) {
  // noinspection JSUnusedGlobalSymbols
  var pool = genericPool.createPool({
    create: function () {
      return new Promise(function (resolve) {
        var client = new net.Socket();
        client.connect(port, host, function () {
          resolve(client);
        });
      });
    },

    destroy: function (client) {
      return new Promise(function (resolve, reject) {
        client.on('close', function (err) {
          if (err) return reject(err);
          return resolve();
        });
        client.destroy();
      });
    }
  }, opts);

  // 注册错误事件
  pool.on('factoryCreateError', function (err) {
    error(err);
  });

  pool.on('factoryDestroyError', function (err) {
    error(err);
  });

  return pool;
};
