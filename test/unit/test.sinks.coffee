sinks = require '../../lib/sinks'

describe "Sink", ->
  {Sink} = sinks

  it "accepts level as symbolic name", ->
    sink = new Sink null, null, 'ERROR'

    assert.equal sink.level, 40

  describe "setLevel", ->
    it "updates the level of the sink", ->
      sink = new Sink null, null, 'ERROR'
      sink.setLevel 20
      assert.equal sink.level, 20

    it "updates the level of the sink from symbolic name", ->
      sink = new Sink null, null, 30
      sink.setLevel 'DEBUG'
      assert.equal sink.level, 10


describe "console", ->
  it "returns a `Sink` instance", ->
    sink = sinks.console()
    assert.instanceOf sink, sinks.Sink

  it "attaches given formatter to sink", ->
    sentinel = ->
    sink = sinks.console
      format: sentinel
    assert.strictEqual sink.format, sentinel

  it "sets level on sink", ->
    sink = sinks.console
      level: 20
    assert.strictEqual sink.level, 20

describe "file", ->
  it "returns a `Sink` instance", ->
    sink = sinks.file
      path: '/dev/null'
    assert.instanceOf sink, sinks.Sink

  it "attaches given formatter to sink", ->
    sentinel = ->
    sink = sinks.file
      path: '/dev/null'
      format: sentinel
    assert.strictEqual sink.format, sentinel

  it "sets level on sink", ->
    sink = sinks.file
      path: '/dev/null'
      level: 20
    assert.strictEqual sink.level, 20
