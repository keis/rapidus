sinon = require 'sinon'

describe "Logger", ->
    {Logger, Record, Sink} = require '../../lib'
    hier = {}

    it "accepts level as symbolic name", ->
        log = new Logger hier, 'foo', 'error'
        assert.equal log.getEffectiveLevel(), 40

    describe "getEffectiveLevel", ->
        it "returns the level of the logger when set", ->
            log = new Logger hier, 'foo', 10
            assert.equal log.getEffectiveLevel(), 10

        it "returns 0 when no level is set", ->
            log = new Logger hier, 'foo'
            assert.equal log.getEffectiveLevel(), 0

        it "checks parent until level is found", ->
            loga = new Logger hier, 'root', 20
            logb = new Logger hier, 'foo', 10
            logc = new Logger hier, 'bar'
            logd = new Logger hier, 'baz'
            logc.parent = logb
            logb.parent = loga
            logd.parent = logc
            assert.equal logd.getEffectiveLevel(), 10

    describe "isEnabledFor", ->
        it "checks if level is below the treshdold", ->
            log = new Logger hier,  'foo', 10
            assert.isTrue log.isEnabledFor 10
            assert.isFalse log.isEnabledFor 9

        it "uses the effective level", ->
            parent = new Logger hier, 'foo', 20
            log = new Logger hier, 'bar'
            log.parent = parent
            assert.isTrue log.isEnabledFor 20
            assert.isFalse log.isEnabledFor 19

    describe "setLevel", ->
        it "sets the level from symbolic name", ->
            log = new Logger hier, 'foo', 10
            log.setLevel 'info'
            assert.equal log.getEffectiveLevel(), 20

        it "sets the level to a number", ->
            log = new Logger hier, 'foo', 10
            log.setLevel 30
            assert.equal log.getEffectiveLevel(), 30

    describe "createRecord", ->
        it "creates an instance of record", ->
            log = new Logger hier, 'foo', 10
            record = log.createRecord 20, "message", ["arg1", "arg2"]
            assert.instanceOf record, Record

        it "calls all the attached processors", ->
            log = new Logger hier, 'foo', 10
            log.addProcessor (record) ->
                record.procone = true
            log.addProcessor (record) ->
                record.proctwo = true
            record = log.createRecord 20, "message", ["arg1", "arg2"]
            assert.propertyVal record, 'procone', true
            assert.propertyVal record, 'proctwo', true

    describe "importRecord", ->
        it "creates a record instance from a JSON representation", ->
            log = new Logger hier, 'foo', 10
            extrecord =
                name: 'foo'
                level: 10
                timestamp: '1401995732345'
                msg: 'zoidberg'
                args: null

            record = log.importRecord extrecord
            assert.instanceOf record, Record
            assert.instanceOf record.timestamp, Date

        it "carries additional attributes to instance", ->
            log = new Logger hier, 'foo', 10
            extrecord =
                name: 'foo'
                level: 10
                timestamp: '1401995732345'
                msg: 'zoidberg'
                txid: 'asdaf'
                args: null
            record = log.importRecord extrecord
            assert.propertyVal record, 'txid', 'asdaf'

    describe "addSink", ->
        it "wraps function in Sink instance", ->
            log = new Logger hier, 'foo'
            log.addSink (record) ->
                something
            assert.instanceOf log.sinks[0], Sink

        it "appends sink instances as is", ->
            log = new Logger hier, 'foo'
            sink = new Sink
            log.addSink sink
            assert.instanceOf log.sinks[0], Sink
            assert.strictEqual log.sinks[0], sink

    describe "log", ->
        it "calls sinks with record created from input", ->
            log = new Logger hier, 'foo'
            sink = sinon.stub()
            log.addSink sink
            log.log 10, "foo"
            assert.calledOnce sink
            assert.calledWith sink, sinon.match.instanceOf Record

        it "does not call any sinks when level is below logger threshold", ->
            log = new Logger hier, 'foo', 20
            sink = sinon.stub()
            log.addSink sink
            log.log 10, 'foo'
            assert.equal sink.called, 0

        it "does not call sink when level is below sink threshold", ->
            log = new Logger hier, 'foo', 20
            sink = sinon.stub()
            log.addSink new Sink sink, null, 30
            log.addSink new Sink sink, null, 20
            log.log 20, 'foo'
            assert.calledOnce sink

        it "converts the symbolic names of log levels", ->
            log = new Logger hier, 'foo'
            sink = sinon.stub()
            log.addSink sink
            log.log 'WARNING', 'foo'
            assert.calledOnce sink
            assert.equal sink.args[0][0].level, 30

        it "sends record to proxy", ->
            proxyHier =
                proxy:
                    sendRecord: sinon.stub()

            log = new Logger proxyHier, 'foo'
            log.log 20, 'foo'

            assert.calledOnce proxyHier.proxy.sendRecord
            assert.calledWith proxyHier.proxy.sendRecord, sinon.match.instanceOf Record

        it "does not send record to proxy when below threshold", ->
            proxyHier =
                proxy:
                    sendRecord: sinon.stub()

            log = new Logger proxyHier, 'foo', 30
            log.log 20, 'foo'

            assert.equal proxyHier.proxy.sendRecord.called, 0

        it "calls sink further up the hierarchy", ->
            log = new Logger hier, 'foo.bar', 20
            log.parent = new Logger hier, 'foo', 20
            psink = sinon.stub()
            log.parent.addSink psink
            sink = sinon.stub()
            log.addSink sink

            log.log 'WARNING', 'foo'

            assert.calledOnce psink
            assert.calledOnce sink
            assert.equal sink.args[0][0].level, 30

        it "does not propagate records further when `propagate` is false", ->
            log = new Logger hier, 'foo.bar', 20
            log.parent = new Logger hier, 'foo', 20
            log.propagate = false
            psink = sinon.stub()
            log.parent.addSink psink
            sink = sinon.stub()
            log.addSink sink

            log.log 'WARNING', 'foo'

            assert.calledOnce sink
            assert.equal psink.callCount, 0, "call count of parent"

    describe "debug", ->
        it "create log message at debug level", ->
            log = new Logger hier, 'foo'
            sink = sinon.stub()
            log.addSink sink
            log.debug 'foo'
            assert.calledOnce sink
            assert.equal sink.args[0][0].level, 10

    describe "trace", ->
        it "create log message at trace level", ->
            log = new Logger hier, 'foo'
            sink = sinon.stub()
            log.addSink sink
            log.trace 'foo'
            assert.calledOnce sink
            assert.equal sink.args[0][0].level, 5
