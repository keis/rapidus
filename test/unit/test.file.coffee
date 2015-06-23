tempfile = require 'tempfile'
fs = require 'fs'

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

  it "writes record to file", (done) ->
    a = tempfile('.log')

    after (done) ->
      fs.unlink a, ->
        done()

    sink = sinks.file
      path: a
      format: (x) -> x.message

    sink.write
      message: 'first message'

    setImmediate ->
      fs.readFile a, 'utf-8', (err, data) ->
        assert.notOk err
        assert.equal data, 'first message\n'
        done()

  it "reopens file when reset", (done) ->
    a = tempfile('.log')
    b = tempfile('.log')

    after (done) ->
      fs.unlink a, ->
        fs.unlink b, ->
          done()

    sink = sinks.file
      path: a
      format: (x) -> x.message

    sink.write
      message: 'first message'

    setImmediate ->
      fs.rename a, b, (err) ->
        sink.reset()
        sink.write
          message: 'second message'

        setImmediate ->
          fs.readFile a, 'utf-8', (err, data) ->
            assert.notOk err
            assert.equal data, 'second message\n'

            fs.readFile b, 'utf-8', (err, data) ->
              assert.notOk err
              assert.equal data, 'first message\n'
              done()
