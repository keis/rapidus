sinon = require 'sinon'

describe 'Record', ->
    {Record} = require '../..'

    it "sets the expected attributes", ->
        record = new Record 'name', 'level', 'time', 'msg', 'args'
        assert.equal record.name, 'name'
        assert.equal record.level, 'level'
        assert.equal record.time, 'time'
        assert.equal record.msg, 'msg'
        assert.equal record.args, 'args'

    describe "getMessage", ->
        it "formats message by combining with args", ->
            record = new Record 'name', 10, Date.now(), "%s - %s", ['foo', 10]
            message = record.getMessage()
            assert.equal message, "foo - 10"
