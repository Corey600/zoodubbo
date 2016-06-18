/**
 * Created by Corey600 on 2016/6/18.
 */

function ZD() {
    this._dubbo = '2.5';
}

ZD.prototype.getZooFromCache = function(path){
    return null;
};

ZD.prototype.getZooFromClient = function(path, version, cb){
    setTimeout(function(){
        cb(null, {
            host: '127.0.0.1',
            port: 3600,
            methods: ['get']
        })
    }, 300);
};

module.exports = ZD;
