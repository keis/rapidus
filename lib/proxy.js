// This is a module to enable logging to resources that can only have a single
// handle open, such as files, in a multi process environment.

// Primarily depends on the `net` module to create client and server
// endpoints. The `fs` module is used in the wrappers to enable working with
// UNIX-sockets.
var net = require('net'),
    fs = require('fs');

// # client

// The client extends `net.Socket` by adding a method to send a log record
// over the wire. It opens a connection to the server specified by `path`.
// This is typically a UNIX-socket but this function is kept unknowing of the
// details.
function client(path) {
    var sock = net.connect(path);

    // Attach method for sending log records, by calling `getMessage` the
    // message is formatted and cached.
    sock.sendRecord = function send(record) {
        record.getMessage();
        this.write(JSON.stringify(record) + "\n");
    };

    // Return the socket
    return sock;
}

// # server

// The server accepts log records from multiple clients and sends them through
// the logger hierarchy specified when creating the server.
function server(hier) {
    var server = net.createServer();

    // Take a single log record and dispatch it through the correct logger.
    function handleMessage(message) {
        var logger = hier.getLogger(message.name);

        logger.dispatch(logger.importRecord(message));
    }

    // For each connection a independent buffer of received data is maintained.
    server.on('connection', function (sock) {
        var buffer = '';

        // Whenever data is received start by appending it to the buffer, and
        // set counters to 0
        sock.on('data', function (data) {
            var start = 0,
                json,
                i;

            buffer += data.toString();

            // Each log record is separated by a newline. Iteratively pick out
            // slices of the buffer fenced by newlines until no more complete
            // lines remain in the buffer and parse each slice as `JSON`. Each
            // Object is receieved is passed to `handleMessage`
            while ((i = buffer.indexOf('\n', start)) >= 0) {
                json = buffer.slice(start, i);
                handleMessage(JSON.parse(json));
                start = i + 1;
            }

            // Consume data from buffer that was processed.
            buffer = buffer.slice(start);
        });
    });

    // Return server instance
    return server;
}

// # Exports

// Expose the underlying functions for easier testing and for the case when
// the assumptions made by the wrappers is causing problems.
module.exports.server = server;
module.exports.client = client;

// Check for the existence of the `LOGGING_PROXY` environment variable.
module.exports.isAvailable = function () {
    return !!process.env.LOGGING_PROXY;
}

// Creates a new client. By default the proxy set in `LOGGING_PROXY` is used.
module.exports.createClient = function (path) {
    path = path || process.env.LOGGING_PROXY;
    return client(path);
}

// Creates a new server. By default the proxy listens to `/tmp/logging-${pid}.sock`
module.exports.createServer = function (path, hier) {
    var proxy = server(hier);

    // Select path to use and export it to the environment as `LOGGING_PROXY`
    path = path || ('/tmp/logging-' + process.pid + '.sock');
    process.env.LOGGING_PROXY = path;

    // unlink any stale file at the socket location and then start listening.
    fs.unlink(path, function (err) {
        if (err && err.code !== 'ENOENT') {
            proxy.trigger('error', err);
            return;
        }
        proxy.listen(path);
    });

    // If the opportunity to cleanly exit is given unlink the socket if
    // something horrible happens at this point there is not much to be done
    // about it
    process.on('exit', function cleanup() {
        try {
            fs.unlinkSync(path);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    });

    // Return the server
    return proxy;
}
