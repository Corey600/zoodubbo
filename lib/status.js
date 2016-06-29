/**
 * Created by feichenxi on 2016/6/23.
 */

'use strict';

/**
 * Message of status code.
 *
 * @type {{}}
 */
var MSG = {};

/**
 * To add message.
 *
 * @param code
 * @param msg
 * @returns {*}
 */
function defineCode(code, msg){
    MSG[code] = msg;
    return code;
}

/**
 * To define the status code.
 *
 * @type {{}}
 */
var CODE = {
    OK:                defineCode( 20, 'ok' ),
    CLIENT_TIMEOUT:    defineCode( 30, 'clien side timeout' ),
    SERVER_TIMEOUT:    defineCode( 31, 'server side timeout' ),
    BAD_REQUEST:       defineCode( 40, 'request format error' ),
    BAD_RESPONSE:      defineCode( 50, 'response format error' ),
    SERVICE_NOT_FOUND: defineCode( 60, 'service not found' ),
    SERVICE_ERROR:     defineCode( 70, 'service error'),
    SERVER_ERROR:      defineCode( 80, 'internal server error'),
    CLIENT_ERROR:      defineCode( 90, 'internal server error')
};

/**
 * Expose `CODE` and `MSG`.
 *
 * @type {{CODE: {}, MSG: {}}}
 */
module.exports = {
    CODE: CODE,
    MSG: MSG
};
