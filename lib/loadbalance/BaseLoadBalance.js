/**
 * Created by Corey600 on 2017/9/9.
 */

'use strict';

/**
 * param key
 *
 * @type {string}
 */
var WEIGHT_KEY = 'weight';
var TIMESTAMP_KEY = 'timestamp';
var WARMUP_KEY = 'warmup';

/**
 * default value
 *
 * @type {number}
 */
var DEFAULT_WEIGHT = 100;
var DEFAULT_WARMUP = 10 * 60 * 1000;

/**
 * Constructor of BaseLoadBalance.
 *
 * @returns {BaseLoadBalance}
 * @constructor
 */
function BaseLoadBalance() {
  if (!(this instanceof BaseLoadBalance)) return new BaseLoadBalance();
}

/**
 * 选择提供者
 *
 * @param {Array} providers
 * @returns {Object}
 */
BaseLoadBalance.prototype.select = function (providers) {
  if (null === providers || 0 === providers.length) return null;
  if (1 === providers.length) return providers[0];
  return this.doSelect(providers);
};

/**
 * 按负载均衡算法选择提供者，会被子类覆盖
 *
 * @param {Array} providers
 * @returns {Object}
 */
BaseLoadBalance.prototype.doSelect = function (providers) {
  return providers[0];
};

/**
 * 获取权重
 *
 * @param {Object} provider
 * @returns {number}
 */
BaseLoadBalance.prototype.getWeight = function (provider) {
  var weight = provider[WEIGHT_KEY] || DEFAULT_WEIGHT;
  if (0 < weight) {
    var timestamp = provider[TIMESTAMP_KEY] || 0;
    if (0 < timestamp) {
      var uptime = (new Date()).getTime() - timestamp;
      var warmup = provider[WARMUP_KEY] || DEFAULT_WARMUP;
      if (0 < uptime && uptime < warmup) {
        weight = this._calculateWarmupWeight(uptime, warmup, weight);
      }
    }
  }
  return weight;
};

/**
 * 计算权重
 *
 * @param {number} uptime
 * @param {number} warmup
 * @param {number} weight
 * @returns {number}
 * @private
 */
BaseLoadBalance.prototype._calculateWarmupWeight = function (uptime, warmup, weight) {
  var ww = Math.floor((uptime * weight) / warmup);
  var min = ww > weight ? weight : ww;
  return 1 > ww ? 1 : min;
};

/**
 * 获取范围内随机数
 *
 * @param {number} sum
 * @returns {number}
 */
BaseLoadBalance.prototype._random = function (sum) {
  return Math.floor(Math.random() * sum);
};

/**
 * Expose `BaseLoadBalance`.
 *
 * @type {BaseLoadBalance}
 */
module.exports = BaseLoadBalance;
