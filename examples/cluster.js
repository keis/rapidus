var cluster = require('cluster'),
    logging = require('../lib'),
    sinks = require('../lib/sinks');

function master() {
    logging.createProxy();

    logging.getLogger('foo.baz').addSink(sinks.console());
    logging.getLogger('foo').addSink(sinks.file('./cluster-example.log'));

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
        baz = logging.getLogger('foo.baz');

    if (logging.isProxyAvailable()) {
        logging.enableProxy();
    }

    process.on('SIGUSR2', function () {});

    setInterval(function () {
        bar.info('test 1 %s', process.pid);
        bar.error('test 2 %s', process.pid);
        baz.debug('test 3 %s', process.pid);
    }, 1000);
}

logging.getLogger('foo.bar').setLevel('ERROR');
logging.getLogger('foo.baz').setLevel('DEBUG');

if (cluster.isMaster) {
    master();
} else {
    worker();
}
