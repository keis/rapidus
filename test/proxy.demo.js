var cluster = require('cluster'),
    proxy = require('../proxy');
    logging = require('../');

function master() {
    proxy.createServer(null, logging.Logger.prototype.hier).on('error', function (err) {
        console.log("error!", err);
    });

    for (var i = 0; i < 4; i++) {
        cluster.fork();
    }
}

function worker() {
    var client = proxy.createClient(),
        record;

    setInterval(function () {
        record = new logging.Record('foo.bar', 10, Date.now(), "Message %d", [process.pid]);
        client.sendRecord(record);
    }, 1000);
}

if (cluster.isMaster) {
    logging.getLogger('foo').addSink(function (record) {
        console.log("got a record", process.pid, record.msg);
    });
    master();
} else {
    worker();
}
