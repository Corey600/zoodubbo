/**
 * Created by Corey600 on 2016/6/17.
 */

// modules to test
var ZD = require('../index');
var Invoker = require('../lib/invoker');
var Codec = require('../lib/codec');

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
                var zd = ZD(null);
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

            var zd = ZD(null);
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

            var zd = ZD(null);
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

            var zd = ZD(null);
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
        it('excute callback error', function (done) {
            var invoker = Invoker(null, {
                path: 'com.demo.Service'
            });
            var method = 'get';
            var arg1 = {$class: 'java.lang.String', $: '123456789'};
            invoker.excute(method, [arg1], function (err, data) {
                expect(err).to.be.a(Error);
                expect(data).to.be(undefined);
                return done();
            });
        });

        it('excute promise error', function (done) {
            var invoker = Invoker(null, {
                path: 'com.demo.Service'
            });
            var method = 'get';
            var arg1 = {$class: 'java.lang.String', $: '123456789'};
            invoker.excute(method, [arg1]).then(function(data){
                expect(data).to.be(undefined);
                return done();
            }).catch(function(err){
                expect(err).to.be.a(Error);
                return done();
            });
        });

        it('socket close error', function (done) {
            mm(zookeeper, 'createClient', function(conn, opt){
                return new MyZookeeper(conn, opt);
            });
            //noinspection JSUnresolvedVariable
            mm(MySocket.prototype, 'destroy', function(){
                this.emit('close', true);
            });

            var zd = ZD(null);
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
    });

    describe('lib/codec.js', function () {
        var zd;
        var invoker;

        before(function (done) {
            mm(zookeeper, 'createClient', function(conn, opt){
                return new MyZookeeper(conn, opt);
            });
            zd = new ZD(null);
            zd.connect();
            invoker = zd.getInvoker('com.demo.Service');
            done();
        });

        after(function (done) {
            zd.close();
            done();
        });

        it('encode request', function (done) {
            var codec = new Codec();
            var err = false;
            try{
                var arr = [];
                for(var i=0;i<1000;i++){
                    arr.push({$class: 'int', $: i});
                }
                codec.encodeRequest(invoker, 'get', arr);
            }catch(e){
                err = e;
            }
            expect(err).not.to.be.a(Error);
            done();
        });

        it('large data length', function (done) {
            var codec = new Codec();
            var err = false;
            try{
                var arr = [];
                for(var i=0;i<300000;i++){
                    arr.push({$class: 'int', $: i});
                }
                codec.encodeRequest(invoker, 'get', arr);
            }catch(e){
                err = e;
            }
            expect(err).to.be.a(Error);
            done();
        });

        it('decode response', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xda, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x91, 0xc8, 0x7b]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be(false);
                expect(data).to.be(123);
                done();
            });
        });

        it('wrong magic header', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xaa, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x92]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be.a('string');
                expect(data).to.be(undefined);
                done();
            });
        });

        it('Unknown serialization protocol', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xda, 0xbb, 0x03, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x92]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be.a('string');
                expect(data).to.be(undefined);
                done();
            });
        });

        it('wrong status code', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xda, 0xbb, 0x02, 0x15, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x92]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be.a('string');
                expect(data).to.be(undefined);
                done();
            });
        });

        it('decode failed', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xda, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be.a(Error);
                expect(data).to.be(undefined);
                done();
            });
        });

        it('read error', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xda, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xa1]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be.a(Error);
                expect(data).to.be(undefined);
                done();
            });
        });

        it('no return', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xda, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x92]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be(false);
                expect(data).to.be(undefined);
                done();
            });
        });

        it('return error', function (done) {
            var codec = new Codec();
            codec.clearChunk();
            codec.pushChunk(new Buffer([0xda, 0xbb, 0x02, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x90, 0xc8, 0x7b]));
            codec.decodeResponse(function(err, data){
                expect(err).to.be(123);
                expect(data).to.be(undefined);
                done();
            });
        });
    });
});
