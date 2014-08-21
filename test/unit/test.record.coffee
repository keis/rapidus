sinon = require 'sinon'

describe 'Record', ->
    {Record} = require '../../lib'

    it "sets the expected attributes", ->
        record = new Record 'name', 'level', 'timestamp', 'msg', 'args'
        assert.equal record.name, 'name'
        assert.equal record.level, 'level'
        assert.equal record.timestamp, 'timestamp'
        assert.equal record.msg, 'msg'
        assert.equal record.args, 'args'

    describe "getLevelName", ->
        it "returns the symbolic name of the level", ->
            record = new Record 'name', 10, new Date, "test", []
            assert.equal record.getLevelName(), 'DEBUG'

            record = new Record 'name', 40, new Date, "test", []
            assert.equal record.getLevelName(), 'ERROR'

    describe "getMessage", ->
        it "formats message by combining with args", ->
            record = new Record 'name', 10, new Date, "%s - %s", ['foo', 10]
            message = record.getMessage()
            assert.equal message, "foo - 10"

        it "uses the stack of error objects", ->
            err = new Error 'test'

            record = new Record 'name', 10, new Date, "error", [err]
            message = record.getMessage()
            assert.match message, /^error Error: test/

        it "caches the formatted message and unsets the original args", ->
            record = new Record 'name', 10, new Date, "%s - %s", ['foo', 10]
            x = record.getMessage()
            assert.equal record.args, null
            y = record.getMessage()
            assert.equal x, y

    describe "getTime", ->
        date = new Date 'Thu Aug 21 2014 10:38:27 GMT+0200 (CEST)'

        it "returns a formatted time string", ->
            record = new Record 'name', 10, date, "%s - %s", ['foo', 10]
            time = record.getTime()
            assert.equal time, '10:38:27.000'

    describe "getDate", ->
        date = new Date 'Thu Aug 21 2014 10:38:27 GMT+0200 (CEST)'

        it "returns a formatted date string", ->
            record = new Record 'name', 10, date, "%s - %s", ['foo', 10]
            time = record.getDate()
            assert.equal time, '2014-08-21'
