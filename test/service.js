/**
 * Created by Corey600 on 2016/6/18.
 */

// modules to test
var Service = require('../lib/service');

// require core modules
var net = require('net');
var EventEmitter = require('events');

// require thirdpart modules
var expect = require('expect.js');
var mm = require('mm');

// require custom modules
var MySocket = require('./lib/my_socket');
var ZD = require('./lib/my_zd');

describe('/lib/service', function () {
    var service;

    before(function () {
        mm(net, 'Socket', MySocket);
        service = new Service(new ZD(), {
            path: 'com.demo.Service'
        });
    });

    after(function (done) {
        done();
    });

    describe('normal', function () {
        it('normal', function (done) {
            var method = 'get';
            var subseril = {$class: 'java.lang.String', $: '094997034'};
            service.excute(method, [subseril], function (err, data) {
                if (err) {
                    console.log('error:' + err);
                    done();
                    return;
                }
                console.log('data:' + data);
                done();
            });
        });
    });

});
