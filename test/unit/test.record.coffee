sinon = require 'sinon'

describe 'Record', ->
    {Record} = require '../../lib'

    it "sets the expected attributes", ->
        record = new Record 'name', 'level', 'time', 'msg', 'args'
        assert.equal record.name, 'name'
        assert.equal record.level, 'level'
        assert.equal record.time, 'time'
        assert.equal record.msg, 'msg'
        assert.equal record.args, 'args'

    describe "getLevelName", ->
        it "returns the symbolic name of the level", ->
            record = new Record 'name', 10, Date.now(), "test", []
            assert.equal record.getLevelName(), 'DEBUG'

            record = new Record 'name', 40, Date.now(), "test", []
            assert.equal record.getLevelName(), 'ERROR'

    describe "getMessage", ->
        it "formats message by combining with args", ->
            record = new Record 'name', 10, Date.now(), "%s - %s", ['foo', 10]
            message = record.getMessage()
            assert.equal message, "foo - 10"
