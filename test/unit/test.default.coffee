net = require 'net'
sinon = require 'sinon'

describe "default logger hierarchy", ->
  {Record, Sink} = logging = require '../../lib'
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
      proc = sinon.stub()

      logging.addDefaultProcessor proc
      log = logging.getLogger 'bar'
      log.info 'test'
      assert.calledOnce proc
      assert.calledWith proc, sinon.match.instanceOf Record

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

  describe "resetSinks", ->
    it "resets the sinks of the default hierarchy", ->
      sink = new Sink
      sink.reset = sinon.stub()

      logging.getLogger 'foo'
        .addSink sink

      logging.resetSinks()

      assert.calledOnce sink.reset
