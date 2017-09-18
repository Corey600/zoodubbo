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
    if (-1 < path.indexOf('providers')) {
      cb(false, [
        'dubbo%3A%2F%2F127.0.0.1%3A20880%2Fcom.demo.Service%3Fanyhost%3Dtrue%26application%3DDemo%26dubbo%3D2.5.3%26version%3D1.0.0%26interface%3Dcom.demo.Service%26methods%3Dpost%2Cget%26owner%3Dxxx%26pid%3D22792%26revision%3D1.0.0-SNAPSHOT%26side%3Dprovider%26timestamp%3D1467033838005%26weight%3D100%26warmup%3D9467033838005',
        'dubbo%3A%2F%2F127.0.0.1%3A20881%2Fcom.demo.Service%3Fanyhost%3Dtrue%26application%3DDemo%26dubbo%3D2.5.3%26version%3D1.0.0%26interface%3Dcom.demo.Service%26methods%3Dpost%2Cget%26owner%3Dxxx%26pid%3D22792%26revision%3D1.0.0-SNAPSHOT%26side%3Dprovider%26timestamp%3D1467033838006%26weight%3D100'
      ]);
    } else {
      cb(false, [
        'override%3A%2F%2F127.0.0.1%3A20880%2Fcom.demo.Service%3Fcategory%3Dconfigurators%26dynamic%3Dfalse%26enabled%3Dtrue%26weight%3D20',
        'override%3A%2F%2F127.0.0.1%3A20881%2Fcom.demo.Service%3Fcategory%3Dconfigurators%26dynamic%3Dfalse%26enabled%3Dtrue%26weight%3D200',
        'override%3A%2F%2F127.0.0.1%3A20881%2Fcom.demo.Service%3Fcategory%3Dconfigurators%26dynamic%3Dfalse%26enabled%3Dfalse%26weight%3D300'
      ]);
    }
  });
  if (0 < retrys && wt) {
    retrys -= 1;
    setImmediate(function () {
      wt();
    });
  }
};

module.exports = MyZookeeper;
