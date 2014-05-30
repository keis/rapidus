var fs = require('fs'),
    Sink = require('./').Sink;

exports.console = function console(format, level) {
    return new Sink(null, format, level);
}

exports.file = function file(path, format, level) {
    var options = {flags: 'a', encoding: 'utf-8'},
        stream = fs.createWriteStream(path, options);

    function write(record) {
        stream.write(this.format(record) + '\n');
    }

    process.on('SIGUSR2', function() {
        if (stream) {
            stream.end();
        }
        stream = fs.createWriteStream(path, options)
    });

    return new Sink(write, format, level);
}
