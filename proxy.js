var net = require('net'),
    fs = require('fs');

function client(path) {
    var sock = net.connect(path);

    sock.sendRecord = function send(record) {
        record.getMessage(); // force message to be cached
        this.write(JSON.stringify(record) + "\n");
    };

    return sock;
}

function server(hier) {
    var server = net.createServer();

    function handleMessage(message) {
        var logger = hier.getLogger(message.name);

        logger.dispatch(logger.importRecord(message));
    }

    server.on('connection', function (sock) {
        var buffer = '';

        sock.on('data', function (data) {
            var start = 0,
                json,
                i;

            buffer += data.toString();

            while ((i = buffer.indexOf('\n', start)) >= 0) {
                json = buffer.slice(start, i);
                handleMessage(JSON.parse(json));
                start = i + 1;
            }
            buffer = buffer.slice(start);
        });
    });

    return server;
}

module.exports.server = server;
module.exports.client = client;

module.exports.isAvailable = function () {
    return !!process.env.LOGGING_PROXY;
}

module.exports.createClient = function (path) {
    path = path || process.env.LOGGING_PROXY;
    return client(path);
}

module.exports.createServer = function (path, hier) {
    var proxy = server(hier);

    path = path || ('/tmp/logging-' + process.pid + '.sock');
    process.env.LOGGING_PROXY = path;

    fs.unlink(path, function (err) {
        if (err && err.code !== 'ENOENT') {
            proxy.trigger('error', err);
            return;
        }
        proxy.listen(path);
    });

    process.on('exit', function cleanup() {
        fs.unlinkSync(path);
    });

    return proxy;
}
