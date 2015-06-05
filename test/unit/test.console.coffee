rewire = require 'rewire'
{Writable} = require 'readable-stream'

describe "console", ->
  sinks = rewire  '../../lib/sinks'
  write = new Writable

  beforeEach ->
    sinks.__set__ 'defaultWrite', write

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
