net = require 'net'

describe "default logger hierarchy", ->
    logging = require '../../lib'
    root = logging.getLogger()
    hier = root.hier

    afterEach ->
        hier.processors = []
        hier.proxy = null
        process.env.LOGGING_PROXY = ''

    describe "getLogger", ->
        it "creates a logger", ->
            log = logging.getLogger 'foo'
            assert.equal log.name, 'foo'
            assert.strictEqual log.parent, root

    describe "addDefaultProcessor", ->
        it "adds a processor to the default hierarchy", ->
            proc = (record) -> null

            logging.addDefaultProcessor proc
            log = logging.getLogger 'bar'
            assert.deepEqual log.processors, [proc]

    describe "enableProxy", ->
        server = net.createServer()

        before (done) ->
            server.listen done

        after (done) ->
            server.close done

        it "attaches a proxy client to the default hierarchy", ->
            logging.enableProxy
                port: server.address().port
            assert.property hier, 'proxy'
            assert.isFunction hier.proxy.on
            hier.proxy.end()

    describe "createProxy", ->
        it "creates a proxy server for the default hierarchy", ->
            proxy = logging.createProxy()
            assert.isFunction proxy.on

    describe "createHierarchy", ->
        it "creates a new hierarchy", ->
            hier = logging.createHierarchy()
            assert.instanceOf hier, logging.Hierarchy
