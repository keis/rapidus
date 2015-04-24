{Record} = require '../../lib'
net = require 'net'
sinon = require 'sinon'

testServer = ->
  expect = []
  server = net.createServer()

  server.after = (after) ->
    if @_doneCallback
      throw new Error "done callback already set"
    @_doneCallback = after

  server.done = (err) ->
    @_doneCallback err
    @_doneCallback = null

  server.expect = (verify) ->
    expect.push(verify)

  server.on 'connection', (sock) ->
    sock.on 'data', (chunk) ->
      verify = expect.shift()

      try
        verify chunk
      catch err
        server.done(err)

      if expect.length == 0
        server.done()

  server


send = (server, data) ->
  sock = new net.Socket

  server.emit 'connection', sock
  sock.emit 'data', data
  sock.emit 'end'


describe "proxy", ->
  proxy = require '../../lib/proxy'

  describe "isAvailable", ->
    it "is true if a proxy path is in the environment", ->
      process.env['LOGGING_PROXY'] = '/tmp/blah'
      assert.isTrue proxy.isAvailable()

    it "is false if no proxy path is in the environment", ->
      delete process.env['LOGGING_PROXY']
      assert.isFalse proxy.isAvailable()

  describe "client", ->
    server = testServer()

    before (done) ->
      server.listen done

    after (done) ->
      server.close done

    it "sends record over socket", (done) ->
      port = server.address().port
      record = new Record 'name', 10, Date.now(), "%s - %s", ['foo', 10]

      server.after done
      server.expect (chunk) ->
        json = JSON.parse chunk.toString()
        assert.propertyVal json, 'name', 'name'
        assert.propertyVal json, 'msg', 'foo - 10'

      client = proxy.client {port: port}
      client.sendRecord(record)
      client.end()

    it "formats fancy objects before sending", (done) ->
      port = server.address().port
      record = new Record 'name', 10, Date.now(), "%s - %s",
                          ['foo', new Error("OMG")]

      server.after done
      server.expect (chunk) ->
        json = JSON.parse chunk.toString()
        assert.propertyVal json, 'msg', 'foo - Error: OMG'

      client = proxy.client {port: port}
      client.sendRecord(record)
      client.end()

  describe "server", ->
    hier = {}
    logger = {}
    record = {__x: 777}

    beforeEach ->
      hier.getLogger = sinon.stub().returns(logger)
      logger.importRecord = sinon.stub().returns(record)
      logger.dispatch = sinon.stub()

    server = proxy.server hier

    it "dispatches record received", ->
      send server, JSON.stringify({name: 'test'}) + '\n'

      assert.calledOnce hier.getLogger
      assert.calledWith hier.getLogger, 'test'
      assert.calledOnce logger.importRecord
      assert.calledWith logger.importRecord, {name: 'test'}
      assert.calledOnce logger.dispatch
      assert.calledWith logger.dispatch, record
