// this example requires `express`, `continuation-local-storage` and
// `connect-continuation-id` to run
var express = require('express'),
    assignId = require('connect-continuation-id'),
    createNamespace = require('continuation-local-storage').createNamespace,
    logging = require('../lib'),
    sinks = require('../lib/sinks'),
    namespace = createNamespace('express-example'),
    app;

// Setup a processor that attaches the request id to the log record
logging.addDefaultProcessor(function (record) {
    record.requestId = namespace.get('continuationId');
});

// Configure a access log that is more or less directly yanked from morgan the
// connect logger
function accessLog() {
    var logger = logging.getLogger('access');

    function responseTime(req, res) {
        if (!res._header || !req._startAt) {
            return '';
        }

        var tdiff = process.hrtime(req._startAt),
            ms = tdiff[0] * 1e3 + tdiff[1] * 1e-6;

        return ms.toFixed(3);
    }

    // A bit of a funky processor that pops the req object that was stored as
    // `msg` and populates the record with details of the request
    logger.addProcessor(function (record) {
        var req = record.msg,
            res = req.res,
            url = req.originalUrl || req.url;

        record.msg = record.url = url;
        record.time = req._startTime;
        record.remoteAddress = req.connection && req.connection.remoteAddress;
        record.method = req.method;
        record.status = res._header ? res.statusCode : null;
        record.responseTime = responseTime(req, res);
    });

    // The middleware
    return function (req, res, next) {
        req._startAt = process.hrtime();
        req._startTime = new Date();

        function log() {
            res.removeListener('finish', log);
            res.removeListener('close', log);
            // This abuses the fact that msg is not forced to be a string when
            // being created and relies on the processor to fix this.
            // util.format happens to do something pretty useful with objects
            // passed so this should be a blessed usage.
            logger.info(req);
        }

        res.on('finish', log);
        res.on('close', log);

        next();
    }
}

// Add a sink to the app logger that writes records to the console with their
// associated request id
logging.getLogger('app').addSink(
    sinks.console(logging.createFormatter(
        ':requestId - :levelName - :message')));

// Add a sink to the access logger that writes http method, url etc to console
logging.getLogger('access').addSink(
    sinks.console(
        logging.createFormatter(
            ':requestId - :levelName - :method :url :status :responseTime')));

// Construct a express application with a middleware to configure an id for
// each request in the cls
app = express();
app.use(assignId(namespace));
app.use(accessLog());
app.get('/test', function (req, res, next) {
    var logger = logging.getLogger('app');
    logger.info("processing request");
    setTimeout(function () {
        logger.info("request processed");
        res.send(200, "zoidberg");
    }, 2000);
});

app.listen(4000);
console.log("listening on 4000, try running a command like")
console.log("http http://localhost:4000/test & http http://localhost:4000/test");
