var chai = require('chai'),
    sinon = require('sinon');

sinon.assert.expose(chai.assert, {prefix: ''});
global.assert = chai.assert;
