describe "file", ->
  sinks = require  '../../lib/sinks'

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
