{Hierarchy, Logger} = require '../..'

describe "Hierarchy", ->
    root = new Logger 'root'
    hier = null

    beforeEach ->
        hier = new Hierarchy root

    it "creates a logger", ->
        log = hier.getLogger 'foo'
        assert.equal log.name, 'foo'
        assert.strictEqual log.parent, root

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
