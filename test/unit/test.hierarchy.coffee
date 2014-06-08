{Hierarchy, Logger} = require '../../lib'

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
        proc = (record) -> null

        hier.addDefaultProcessor proc

        log = hier.getLogger 'foo'
        assert.deepEqual log.processors, [proc]

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
