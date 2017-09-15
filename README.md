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
- Use [Random LoadBalance](https://dubbo.gitbooks.io/dubbo-user-book/demos/loadbalance.html) to choose Provider.
- Use [generic-pool](https://github.com/coopernurse/node-pool) to manage net.Socket.

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

* conf {*String|Object*} - A string of host:port pairs like `conn`. Or an object to set the instance options. Currently available options are:

    * `dubbo` {*String*} - Dubbo version information.

    *The following content could reference: [https://github.com/alexguan/node-zookeeper-client#client-createclientconnectionstring-options](https://github.com/alexguan/node-zookeeper-client#client-createclientconnectionstring-options)*
    * `conn` {*String*} - Just like connectionString of [node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client). Comma separated host:port pairs, each represents a ZooKeeper server.
    * `sessionTimeout` {*Number*} - Session timeout in milliseconds, defaults to 30 seconds.
    * `spinDelay` {*Number*} - The delay (in milliseconds) between each connection attempts.
    * `retries` {*Number*} - The number of retry attempts for connection loss exception.

*Example*

```javascript
// use a string of host:port pairs
var zd = new ZD('localhost:2181,localhost:2182');

// use an object to set the instance options
var zd = new ZD({
    conn: 'localhost:2181,localhost:2182',
    dubbo: '2.5.3'
});
```

----

#### client

The client instance created by [node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client). To listen event such as follows:

```javascript
zd.client.on('connected', function connect() {
    console.log('zookeeper client connected!');
});
```

The list of events could reference: [https://github.com/alexguan/node-zookeeper-client#state](https://github.com/alexguan/node-zookeeper-client#state)

----

#### void connect()

Connect to the Dubbo Registration Center by [node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client). Equivalent to the following code:

```javascript
zd.connect();
// just like
zd.client.connect();
```

----

#### void close()

Close the connection of [node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client). Equivalent to the following code:

```javascript
zd.close();
// just like
zd.client.close();
```

----

#### Invoker getInvoker(path[, opt])

*Arguments*

* path {*String*} - Path of service.
* opt {*Object*} - An object to set the Invoker options. Currently available options are:

    * `version` {*String*} - Service version information.
    * `timeout` {*Number*} - The timeout (in milliseconds) to excute.

    *The following content could reference: [generic-pool](https://github.com/coopernurse/node-pool)*
    * `poolMax` {*Number*} - Maximum number of net.Socket to create from pool at any given time. Defaults to 1 .
    * `poolMin` {*Number*} - Minimum number of net.Socket to keep in pool at any given time. If this is set >= poolMax, the pool will silently set the min to equal max. Defaults to 0 .

*Example*

```javascript
var invoker = zd.getInvoker('com.demo.Service', {
    version: '0.0.0'
});
```

----

### new Invoker(zk[, opt])

Also you can create Invoker instance by URIs of providers directly.

*Arguments*

* zk {*Client|String|Array*} - The ZD instance or the URIs of providers.
* opt {*Object*} - An object to set the instance options. Currently available options are:

    * `path` {*String*} - Path of service.
    * `dubbo` {*String*} - Dubbo version information.

    *The other content is same as the `opt` in `getInvoker(path[, opt])`*

*Example*

```javascript
var invoker = new ZD.Invoker(
  'dubbo://127.0.0.1:20880/com.demo.DemoService?anyhost=true&interface=com.demo.DemoService&methods=sayHello&side=provider',
  { version: '0.0.0' }
);
```

----

#### void excute(method, args[, cb])

*Arguments*

* method {*String*} - Method to excute.
* args {*Array*} - Argument list.
* cb(err, data) {*Function*} - The data is the returned value. When the cb is undefined, the function return a Promise instance.

*Example*

```javascript
var method = 'getUserByID';
var arg1={$class:'int',$:123};

// use callback
invoker.excute(method, [arg1], function (err, data) {
    if (err) {
        console.log(err);
        return;
    }
    console.log(data)
});

// or return a Promise instance
invoker.excute(method, [arg1])
    .then(function(data){
        console.log(data);
    }).catch(function(err){
        console.log(err);
    });
```

----

## License

Licensed under the 
[MIT](http://opensource.org/licenses/MIT)
license.
