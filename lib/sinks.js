var fs = require('fs');

// # Formatter

// Create a formatter function from pattern string
function createFormatter(pattern) {
    var tokens = pattern.split(/(:[a-zA-Z]+)/);

    return function format(record) {
        return tokens.map(function (token) {
            if (token[0] !== ':') {
                return token;
            }

            var val = record[token.substr(1)];
            return (val && val.call ? val.call(record) : val).toString();
        }).join('');
    };
}

exports.createFormatter = createFormatter;

// Default formatter used by sinks when nothing else is specified that tries
// to provide a human friendly format that contains most information without
// being to verbose
defaultFormat = createFormatter(':time - :levelName - :message');

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
    this.level = level;
}

// Call the write function, `this` is bound to the sink to provide access the
// format function.
Sink.prototype.handle = function (record) {
    this.write.call(this, record);
}

exports.Sink = Sink;

// # console

// Create a logger that writes to stderr as per default write
exports.console = function console(format, level) {
    return new Sink(null, format, level);
}

// # file

// Create a logger that writes to a file
exports.file = function file(path, format, level) {
    var options = {flags: 'a', encoding: 'utf-8'},
        sink;

    // write function writes to the bound stream
    function write(record) {
        this.stream.write(this.format(record) + '\n');
    }

    // Create a sink instance and attach a function to reopen the stream to the
    // file which may be useful when logrotate and similar systems comes into
    // play.
    sink = new Sink(write, format, level);
    sink.reset = function () {
        if (this.stream) {
            this.stream.end();
        }
        this.stream = fs.createWriteStream(path, options)
    };
    // reset the file stream immediately to open the first stream
    sink.reset();

    return sink;
}
