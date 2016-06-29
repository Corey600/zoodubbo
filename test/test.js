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

describe('test', function () {
    beforeEach(function (done) {
        mm(net, 'Socket', MySocket);
        done();
    });

    afterEach(function (done) {
        mm.restore();
        done();
    });

    describe('main', function () {
        var zd;

        before(function (done) {
            mm(zookeeper, 'createClient', function(conn, opt){
                return new MyZookeeper(conn, opt);
            });
            zd = new ZD({
                conn: '127.0.0.2:4180,127.0.0.3:4180',
                dubbo: '2.5.3'
            });
            done();
        });

        after(function (done) {
            done();
        });

        it('excute success', function (done) {
            zd.connect();

            var invoker = zd.getInvoker('com.demo.Service', { version: '1.0.0' });
            var method = 'get';
            var arg1 = {$class: 'java.lang.String', $: '123456789'};

            invoker.excute(method, [arg1]).then(function(data){
                expect(data).to.be(undefined);
                zd.close();
                return done();
            }).catch(function(err){
                expect(err).to.be(false);
                zd.close();
                return done();
            });
        });

        it('no method', function (done) {
            zd.connect();

            var invoker = zd.getInvoker('com.demo.Service', { version: '1.0.0' });
            var method = 'getxxx';
            var arg1 = {$class: 'java.lang.String', $: '123456789'};

            invoker.excute(method, [arg1]).then(function(data){
                expect(data).to.be(undefined);
                zd.close();
                return done();
            }).catch(function(err){
                expect(err).to.be.a('string');
                zd.close();
                return done();
            });
        });
    });

    describe('index.js', function () {
        it('connect and close when no client', function (done) {
            mm(zookeeper, 'createClient', function(){
                return null;
            });
            var err = null;
            try{
                var zd = ZD();
                zd.connect();
                zd.close();
            }catch(e){
                err = e;
            }
            expect(err).to.be(null);
            return done();
        });

        it('get children error', function (done) {
            mm(zookeeper, 'createClient', function(conn, opt){
                var zp = new MyZookeeper(conn, opt);
                zp.getChildren = function(path, cb){
                    setTimeout(function(){
                        cb(true);
                    }, 50);
                };
                return zp;
            });

            var zd = ZD();
            zd.connect();

            var invoker = zd.getInvoker('com.demo.Service');
            var method = 'get';
            var arg1 = {$class: 'java.lang.String', $: '123456789'};
            invoker.excute(method, [arg1], function (err, data) {
                expect(err).to.be(true);
                expect(data).to.be(undefined);

                zd.close();
                return done();
            });
        });

        it('get no children', function (done) {
            mm(zookeeper, 'createClient', function(conn, opt){
                var zp = new MyZookeeper(conn, opt);
                zp.getChildren = function(path, cb){
                    setTimeout(function(){
                        cb(false, []);
                    }, 50);
                };
                return zp;
            });

            var zd = ZD();
            zd.connect();

            var invoker = zd.getInvoker('com.demo.Service');
            var method = 'get';
            var arg1 = {$class: 'java.lang.String', $: '123456789'};
            invoker.excute(method, [arg1], function (err, data) {
                expect(err).to.be.a('string');
                expect(data).to.be(undefined);

                zd.close();
                return done();
            });
        });

        it('parse children error', function (done) {
            mm(zookeeper, 'createClient', function(conn, opt){
                var zp = new MyZookeeper(conn, opt);
                zp.getChildren = function(path, cb){
                    setTimeout(function(){
                        cb(false, ['xxxxx']);
                    }, 50);
                };
                return zp;
            });

            var zd = ZD();
            zd.connect();

            var invoker = zd.getInvoker('com.demo.Service');
            var method = 'get';
            var arg1 = {$class: 'java.lang.String', $: '123456789'};
            invoker.excute(method, [arg1], function (err, data) {
                expect(err).to.be.a(Error);
                expect(data).to.be(undefined);

                zd.close();
                return done();
            });
        });
    });

    describe('lib/invoker.js', function () {

    });
});


