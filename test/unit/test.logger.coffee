{Logger, Record} = require '../..'

describe "Logger", ->
    describe "getEffectiveLevel", ->
        it "returns the level of the logger when set", ->
            log = new Logger "foo", 10
            assert.equal log.getEffectiveLevel(), 10

        it "returns 0 when no level is set", ->
            log = new Logger "foo"
            assert.equal log.getEffectiveLevel(), 0

        it "checks parent until level is found", ->
            loga = new Logger "root", 20
            logb = new Logger "foo", 10
            logc = new Logger "bar"
            logd = new Logger "baz"
            logc.parent = logb
            logb.parent = loga
            logd.parent = logc
            assert.equal logd.getEffectiveLevel(), 10

    describe "isEnabledFor", ->
        it "checks if level is below the treshdold", ->
            log = new Logger "foo", 10
            assert.isTrue log.isEnabledFor 10
            assert.isFalse log.isEnabledFor 9

        it "uses the effective level", ->
            parent = new Logger "foo", 20   
            log = new Logger "bar"
            log.parent = parent
            assert.isTrue log.isEnabledFor 20
            assert.isFalse log.isEnabledFor 19

    describe "createRecord", ->
        it "creates an instance of record", ->
            log = new Logger "foo", 10
            record = log.createRecord 20, "message", ["arg1", "arg2"]
            assert.instanceOf record, Record
