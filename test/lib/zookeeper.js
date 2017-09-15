/**
 * Created by Corey600 on 2016/6/18.
 */

var retrys = 1;

function MyZookeeper() {
}

MyZookeeper.prototype.connect = function () {
};

MyZookeeper.prototype.close = function () {
};

MyZookeeper.prototype.getChildren = function (path, watcher, callback) {
  var cb;
  var wt;
  if (!callback) {
    cb = watcher;
    wt = undefined;
  } else {
    cb = callback;
    wt = watcher;
  }
  setImmediate(function () {
    cb(false, ['dubbo%3A%2F%2F127.0.0.1%3A20880%2Fcom.demo.Service%3Fanyhost%3Dtrue%26application%3DDemo%26dubbo%3D2.5.3%26version%3D1.0.0%26interface%3Dcom.demo.Service%26methods%3Dpost%2Cget%26owner%3Dxxx%26pid%3D22792%26revision%3D1.0.0-SNAPSHOT%26side%3Dprovider%26timestamp%3D1467033838005']);
  });
  if (0 < retrys && wt) {
    retrys -= 1;
    setImmediate(function () {
      wt();
    });
  }
};

module.exports = MyZookeeper;
