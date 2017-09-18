/**
 * Created by Corey600 on 2017/9/9.
 */

// require core modules
var util = require('util');

// require custom modules
var BaseLoadBalance = require('./BaseLoadBalance');

/**
 * Constructor of RandomLoadBalance.
 *
 * @returns {RandomLoadBalance}
 * @constructor
 */
function RandomLoadBalance() {
  if (!(this instanceof RandomLoadBalance)) return new RandomLoadBalance();
  BaseLoadBalance.call(this);
}

// inherited functions
util.inherits(RandomLoadBalance, BaseLoadBalance);

/**
 * 按负载均衡算法选择提供者
 *
 * @param {Array} providers
 * @returns {Object}
 */
RandomLoadBalance.prototype.doSelect = function (providers) {
  var length = providers.length; // 总个数
  var totalWeight = 0; // 总权重
  var sameWeight = true; // 权重是否都一样
  var i;
  for (i = 0; i < length; i += 1) {
    var weight = this.getWeight(providers[i]);
    totalWeight += weight; // 累计总权重
    if (sameWeight && 0 < i
      && weight !== this.getWeight(providers[i - 1])) {
      sameWeight = false; // 计算所有权重是否一样
    }
  }
  if (0 < totalWeight && !sameWeight) {
    // 如果权重不相同且权重大于0则按总权重数随机
    var offset = this._random(totalWeight);
    // 并确定随机值落在哪个片断上
    for (i = 0; i < length; i += 1) {
      offset -= this.getWeight(providers[i]);
      if (0 > offset) {
        return providers[i];
      }
    }
  }
  // 如果权重相同或权重为0则均等随机
  return providers[this._random(length)];
};

/**
 * Expose `RandomLoadBalance`.
 *
 * @type {RandomLoadBalance}
 */
module.exports = RandomLoadBalance;
