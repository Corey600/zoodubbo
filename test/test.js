/**
 * Created by Corey600 on 2016/6/17.
 */


// modules to test
var ZD = require('../index');

// require core modules
var net = require('net');

// require thirdpart modules
var zookeeper = require('node-zookeeper-client');
var expect = require('expect.js');
var mm = require('mm');

// require custom modules
var MySocket = require('./lib/socket');
var MyZookeeper = require('./lib/zookeeper');

describe('normal', function () {
    var zd;

    before(function () {
        mm(net, 'Socket', MySocket);
        mm(zookeeper, 'createClient', MyZookeeper.createClient);
        zd = new ZD({
            conn: '127.0.0.2:4180,127.0.0.3:4180',
            dubbo: '2.5.3'
        });
    });

    after(function (done) {
        done();
    });

    it('get', function (done) {
        zd.connect();

        var invoker = zd.getInvoker('com.demo.Service');
        var method = 'get';
        var arg1 = {$class: 'java.lang.String', $: '123456789'};

        invoker.excute(method, [arg1], function (err, data) {
            if (err) {
                console.log('error:' + err);
            }
            expect(err).to.be(false);
            expect(data).to.be(undefined);
            return done();
        });
    });

});
