# zoodubbo

[![Build Status](https://api.travis-ci.org/Corey600/zoodubbo.svg)](http://travis-ci.org/Corey600/zoodubbo)
[![Coverage Status](https://coveralls.io/repos/github/Corey600/zoodubbo/badge.svg)](https://coveralls.io/github/Corey600/zoodubbo)
[![NPM Version](http://img.shields.io/npm/v/zoodubbo.svg?style=flat)](https://www.npmjs.org/package/zoodubbo)
[![NPM Downloads](https://img.shields.io/npm/dm/zoodubbo.svg?style=flat)](https://www.npmjs.org/package/zoodubbo)
[![GitHub stars](https://img.shields.io/github/stars/Corey600/zoodubbo.svg?style=flat&label=Star)](https://github.com/Corey600/zoodubbo)

A Javascript module for 
[Node.js](http://nodejs.org)
to connect Dubbo service by
[node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client).

## Installation

You can install it using npm:

```bash
$ npm install zoodubbo
```

## Example

```javascript
var ZD = require('zoodubbo');

var zd = new ZD({
    conn: 'localhost:2181',
    dobbo: '2.5.3'
});

zd.connect();

zd.client.on('connected', function connect() {
    console.log('zookeeper client connected!');
});

var service = zd.getService('com.demo.Service');

var method = 'getUserByID';
var arg1={$class:'int',$:123};

service.excute(method, [arg1], function (err, data) {
    console.log('excute');
    if (err) {
        console.log(err);
        return;
    }
    console.log(data)
});
```

## Thanks

Thank 
[node-zookeeper-dubbo](https://github.com/p412726700/node-zookeeper-dubbo)
provide reference and thoughts.
