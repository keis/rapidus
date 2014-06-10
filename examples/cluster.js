var cluster = require('cluster'),
    logging = require('../lib'),
    sinks = require('../lib/sinks');

function master() {
    var logFile = sinks.file('./cluster-example.log');
    logging.createProxy();

    logging.getLogger('foo.baz').addSink(sinks.console());
    logging.getLogger('foo').addSink(logFile);

    process.on('SIGUSR2', function () {
        logFile.reset();
    });

    logging.getLogger('foo.baz').info("master @ %s", process.pid);

    for (var i = 0; i < 4; i++) {
        cluster.fork();
    }

    cluster.on('exit', function (worker) {
        logging.getLogger('foo').info('%s has left the building', worker.process.pid);
    });

    setTimeout(function () {
        process.exit();
    }, 10000);
}

function worker() {
    var bar = logging.getLogger('foo.bar'),
        baz = logging.getLogger('foo.baz'),
        count = 0;

    if (logging.isProxyAvailable()) {
        logging.enableProxy();
    }

    process.on('SIGUSR2', function () {});

    setInterval(function () {
        count += 1;
        bar.info('test 1 %s #%s', process.pid, count);
        bar.error('test 2 %s #%s', process.pid, count);
        baz.debug('test 3 %s #%s', process.pid, count);
    }, 1000);
}

logging.getLogger('foo.bar').setLevel('ERROR');
logging.getLogger('foo.baz').setLevel('DEBUG');

if (cluster.isMaster) {
    master();
} else {
    worker();
}
