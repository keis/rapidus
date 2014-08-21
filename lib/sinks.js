var fs = require('fs');

// # Formatter

// Create a formatter function from pattern string
function createFormatter(pattern) {
    var tokens = pattern.split(/(:[a-zA-Z]+)/);

    return function format(record) {
        return tokens.map(function (token) {
            // if it's not a placeholder return the token right away
            if (token[0] !== ':') {
                return token;
            }

            // grab the value from the record, if it is a function call it
            // and then coerce it all to a string
            var val = record[token.substr(1)];
            return '' + (val && val.call ? val.call(record) : val);
        }).join('');
    };
}

exports.createFormatter = createFormatter;

// Default formatter used by sinks when nothing else is specified that tries
// to provide a human friendly format that contains most information without
// being to verbose
defaultFormat = createFormatter('[:date :time] - :levelName - :message');

// # Sink

// Default sink write function that will prepare a output line using the
// `format` function of the bound sink and write the formatted record to STDERR
function defaultWrite(record) {
    process.stderr.write(this.format(record) + "\n");
}

// Constructor for a sink object that couple a write function and a format
// function. A sink may also have a log level associated that is inspected by
// the log methods.
function Sink(write, format, level) {
    this.write = write || defaultWrite;
    this.format = format || defaultFormat;
    this.setLevel(level);
}

Sink.prototype.setLevel = require('./levels').setLevel;

// Call the write function, `this` is bound to the sink to provide access the
// format function.
Sink.prototype.handle = function (record) {
    this.write.call(this, record);
}

// Export sink constructor for third-party or application specific sink
// implementations
exports.Sink = Sink;

// Each sink type needs to have a factory method that takes a single option
// hash as argument. The details of the hash is implementation specific except
// for the two properties `format` and `level` which *should* be passed as the
// 2nd and 3rd parameter of `Sink` respectively.

// # console

// Create a logger that writes to stderr as per default write
exports.console = function console(options) {
    options = options || {};
    return new Sink(null, options.format, options.level);
}

// # file

// Create a logger that writes to a file
exports.file = function file(options) {
    var path = options.path,
        streamOptions = {flags: 'a', encoding: 'utf-8'},
        sink;

    // write function writes to the bound stream
    function write(record) {
        this.stream.write(this.format(record) + '\n');
    }

    // Create a sink instance and attach a function to reopen the stream to the
    // file which may be useful when logrotate and similar systems comes into
    // play.
    sink = new Sink(write, options.format, options.level);
    sink.reset = function () {
        if (this.stream) {
            this.stream.end();
        }
        this.stream = fs.createWriteStream(path, streamOptions)
    };
    // reset the file stream immediately to open the first stream
    sink.reset();

    return sink;
}
