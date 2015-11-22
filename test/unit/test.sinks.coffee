sinon = require 'sinon'
rewire = require 'rewire'
{Writable} = require 'readable-stream'

describe "Sink", ->
  {Sink} = require '../../lib/sinks'
  w = null

  beforeEach ->
    w = new Writable
    w.write = sinon.stub()

  it "accepts level as symbolic name", ->
    sink = new Sink w, null, 'ERROR'

    assert.equal sink.level, 40

  it "calls format function before passing it to the write stream", (done) ->
    sentinel = {}
    frmt = sinon.stub().returns 'formatted'
    sink = new Sink w, frmt

    sink.write sentinel

    setImmediate ->
      assert.calledOnce frmt
      assert.calledWith frmt, sentinel
      assert.calledOnce w.write
      assert.calledWith w.write, 'formatted'
      done()

  describe "setLevel", ->
    it "updates the level of the sink", ->
      sink = new Sink w, null, 'ERROR'
      sink.setLevel 20
      assert.equal sink.level, 20

    it "updates the level of the sink from symbolic name", ->
      sink = new Sink w, null, 30
      sink.setLevel 'DEBUG'
      assert.equal sink.level, 10


describe "withNewLine", ->
  it "writes the message with a newline", (done) ->
    sinks = rewire '../../lib/sinks'
    withNewLine = sinks.__get__ 'withNewLine'

    write = new Writable
    write._write = sinon.stub()

    nl = withNewLine()
    nl.pipe write
    nl.write "hello"

    setImmediate ->
      assert.calledOnce write._write
      assert.calledWith write._write, new Buffer "hello\n"
     done()
