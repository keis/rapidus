var fs = require('fs')
  , Sink = require('record-sink')
  , sculpt = require('sculpt')

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

function withNewLine() {
  return sculpt.append('\n')
}

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
    , nl = withNewLine()
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
