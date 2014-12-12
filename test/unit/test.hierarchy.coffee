{Hierarchy, Logger, Record, Sink} = require '../../lib'
sinon = require 'sinon'

describe "Hierarchy", ->
    hier = null
    root = new Logger null, 'root'

    beforeEach ->
        hier = new Hierarchy root
        root.hier = hier

    it "gives access to the root logger", ->
        log = hier.getLogger()
        assert.strictEqual log, root

    it "creates a logger", ->
        log = hier.getLogger 'foo'
        assert.equal log.name, 'foo'
        assert.strictEqual log.parent, root

    it "adds default processors to logger", ->
        proc = sinon.stub()

        hier.addDefaultProcessor proc

        log = hier.getLogger 'foo'
        log.info 'test'
        assert.calledOnce proc
        assert.calledWith proc, sinon.match.instanceOf Record

    it "returns the same logger when called twice", ->
        frst = hier.getLogger 'foo'
        scnd = hier.getLogger 'foo'
        assert.strictEqual frst, scnd

    it "configures parent of sublogger", ->
        parent = hier.getLogger 'foo'
        log = hier.getLogger 'foo.bar'
        assert.equal log.name, 'foo.bar'
        assert.strictEqual log.parent, parent

    it "patches existing loggers when replacing placeholder", ->
        suba = hier.getLogger 'foo.bar'
        subb = hier.getLogger 'foo.baz'
        log = hier.getLogger 'foo'

        assert.strictEqual suba.parent, log
        assert.strictEqual subb.parent, log

    it "resets the sinks of all attached loggers", ->
        suba = hier.getLogger 'foo.bar'
        subb = hier.getLogger 'foo.baz'

        sinka = new Sink
        sinka.reset = sinon.stub()

        sinkb = new Sink
        sinkb.reset = sinon.stub()

        suba.addSink sinka
        suba.addSink sinkb
        suba.addSink {}

        hier.resetSinks()

        assert.calledOnce sinka.reset
        assert.calledOnce sinkb.reset

    it "resets a reused sink once", ->
        suba = hier.getLogger 'foo'
        subb = hier.getLogger 'bar'

        sinka = new Sink
        sinka.reset = sinon.stub()

        suba.addSink sinka
        subb.addSink sinka

        hier.resetSinks()

        assert.calledOnce sinka.reset
