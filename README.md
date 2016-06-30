# zoodubbo

[![Build Status](https://api.travis-ci.org/Corey600/zoodubbo.svg)](http://travis-ci.org/Corey600/zoodubbo)
[![Coverage Status](https://coveralls.io/repos/github/Corey600/zoodubbo/badge.svg)](https://coveralls.io/github/Corey600/zoodubbo)
[![NPM Downloads](https://img.shields.io/npm/dm/zoodubbo.svg?style=flat)](https://www.npmjs.org/package/zoodubbo)
[![NPM Version](http://img.shields.io/npm/v/zoodubbo.svg?style=flat)](https://www.npmjs.org/package/zoodubbo)
[![License](https://img.shields.io/npm/l/zoodubbo.svg?style=flat)](https://www.npmjs.org/package/zoodubbo)

A Javascript module for 
[Node.js](http://nodejs.org)
to connect Dubbo service by
[node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client).

## Features

- Invoke Dubbo service as a Customer.
- Use Zookeeper as the Dubbo Registration Center.
- Only supports the use of the default hessian2 protocol for serialization and deserialization.
- It is not very friendly to support the return value containing an enum type. 

## Installation

You can install it using npm:

```bash
$ npm install zoodubbo
```

## Example

```javascript
var ZD = require('zoodubbo');
var zd = new ZD({
    // config the addresses of zookeeper
    conn: 'localhost:2181'
});

// connect to zookeeper
zd.connect();

// get a invoker with a service path
var invoker = zd.getInvoker('com.demo.Service');

// excute a method with parameters
var method = 'getUserByID';
var arg1={$class:'int',$:123};
invoker.excute(method, [arg1], function (err, data) {
    if (err) {
        console.log(err);
        return;
    }
    console.log(data)
});
```

## Documentation

### new ZD(conf)

*Arguments*

* conf

    * `dubbo` Dubbo version information.
    * `conn` Comma separated host:port pairs, each represents a ZooKeeper server.
    * `sessionTimeout` Session timeout in milliseconds, defaults to 30 seconds.
    * `spinDelay` The delay (in milliseconds) between each connection attempts.
    * `retries` The number of retry attempts for connection loss exception.

*Example*

```javascript
var zd = new ZD({
    conn: 'localhost:2181,localhost:2182',
    dubbo: '2.5.3'
});
```

----

#### client

```javascript
zd.client.on('connected', function connect() {
    console.log('zookeeper client connected!');
});
```

----

#### connect

----

#### close

----

#### getInvoker

----

## Invoker

### excute

----

## Thanks

Thank 
[node-zookeeper-dubbo](https://github.com/p412726700/node-zookeeper-dubbo)
provide reference and thoughts.

## License

Licensed under the 
[MIT](http://opensource.org/licenses/MIT)
license.
