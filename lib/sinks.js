var fs = require('fs')
  , stream = require('readable-stream')
  , assign = require('object-assign')
  , through = require('through2')
  , inherits = require('util').inherits
  , defaultFormat
  , defaultWrite

// # Exports
exports.createFormatter = createFormatter
exports.writableStream = writableStream

// The Sink constructor is exported for third-party or application specific
// sink implementations
exports.Sink = Sink

// Export built-in sinks
exports.console = console
exports.file = file

// Last resort error printing for when everything fails
function printError(err) {
  process.stderr.write('log stream error ' + err + '\n')
}

// # Formatter

// Create a formatter function from pattern string
function createFormatter(pattern) {
  var tokens = pattern.split(/(:[a-zA-Z]+)/)

  return function format(record) {
    return tokens.map(function (token) {
      // if it's not a placeholder return the token right away
      if (token[0] !== ':') {
        return token
      }

      // grab the value from the record, if it is a function call it
      // and then coerce it all to a string
      var val = record[token.substr(1)]

      if (val && val.call) {
        val = val.call(record)
      }

      return val !== void 0 ? '' + val : '-'
    }).join('')
  }
}

// # writableStream

// A helper to create a write a stream from a function
function writableStream(options, write) {
  function Writable (override) {
    if (!(this instanceof Writable)) {
      return new Writable()
    }
    this.options = assign({}, options, override)
    stream.Writable.call(this, this.options)
  }

  inherits(Writable, stream.Writable)

  Writable.prototype._write = write

  return Writable
}

// Default formatter used by sinks when nothing else is specified that tries
// to provide a human friendly format that contains most information without
// being to verbose
defaultFormat = createFormatter('[:date :time] - :levelName - :message')

// # Sink

// Default sink write stream that expects a stream of formatted log messages
// that will be written to STDERR joined with newlines.
WithNewLine = through.ctor({objectMode: true}, function (obj, enc, done) {
  this.push(obj + '\n')
  done()
})

defaultWrite = new WithNewLine()
defaultWrite.pipe(process.stderr)

// Constructor for a sink object that couple a write function and a format
// function. A sink may also have a log level associated that is inspected by
// the log methods. If the sink defines a `reset` function it will be called to
// indicated that any associated file streams etc should be reopened.
function Sink(write, format, level) {
  stream.Transform.call(this, {objectMode: true})
  this.format = format || defaultFormat
  this.setLevel(level)
  this.pipe(write || defaultWrite)
}

inherits(Sink, stream.Transform)

Sink.prototype._transform = function (obj, enc, done) {
  this.push(this.format(obj))
  done()
}

Sink.prototype.setLevel = require('./levels').setLevel

// Each sink type needs to have a factory method that takes a single option
// hash as argument. The details of the hash is implementation specific except
// for the two properties `format` and `level` which *should* be passed as the
// 2nd and 3rd parameter of `Sink` respectively.

// # console

// Create a logger that writes to stderr as per default write
function console(options) {
  options = options || {}
  return new Sink(null, options.format, options.level)
}

// # file

// Create a logger that writes to a file
function file(options) {
  var path = options.path
    , streamOptions = {flags: 'a', encoding: 'utf-8'}
    , nl = new WithNewLine()
    , sink

  // Create a sink instance and attach a function to reopen the stream to the
  // file which may be useful when logrotate and similar systems comes into
  // play.
  sink = new Sink(nl, options.format, options.level)
  sink.reset = function () {
    if (this.stream) {
      nl.unpipe(this.stream)
      this.stream.end()
    }
    this.stream = fs.createWriteStream(path, streamOptions)
    nl.pipe(this.stream)
    this.stream.on('error', printError)
  }
  // reset the file stream immediately to open the first stream
  sink.reset()

  return sink
}
