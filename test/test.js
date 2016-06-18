/**
 * Created by Corey600 on 2016/6/17.
 */

var ZD = require('../lib/zd');

var expect = require('expect.js');

describe('/lib/zd', function () {
    it('demo', function (done) {
        var zd = new ZD({
            conn: 'localhost:2181',
            dobbo: '2.5.3'
        });
        expect(zd.getZooFromCache('demo')).to.eql(undefined);
        done();
    });
});
