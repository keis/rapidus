// this example requires `express`, `continuation-local-storage`,
// 'rapidus-connect-logger` and `connect-continuation-id` to run
var express = require('express'),
    assignId = require('connect-continuation-id'),
    accessLog = require('rapidus-connect-logger'),
    createNamespace = require('continuation-local-storage').createNamespace,
    logging = require('../lib'),
    sinks = require('../lib/sinks'),
    namespace = createNamespace('express-example'),
    app;

// Setup a processor that attaches the request id to the log record
logging.addDefaultProcessor(function (record) {
    record.requestId = namespace.get('continuationId');
});

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

// Attach the continuation id middleware
app.use(assignId(namespace));

// Attach the access log middleware. could also be written as
// `accessLog('access')` but the require of the core module in
// `rapidus-connect-logger` is a bit problematic when runnig these examples
app.use(accessLog({logger: logging.getLogger('access')}));

// Create dummy route
app.get('/test', function (req, res, next) {
    var logger = logging.getLogger('app');
    logger.info("processing request");
    setTimeout(function () {
        logger.info("request processed");
        // Why not
        res.send(200, "zoidberg");
    }, 2000);
});

app.listen(4000);
console.log("listening on 4000, try running a command like")
console.log("http http://localhost:4000/test & http http://localhost:4000/test");
