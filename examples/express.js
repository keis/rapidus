// this example requires `express`, `continuation-local-storage` and
// `connect-continuation-id` to run
var express = require('express'),
    assignId = require('connect-continuation-id'),
    createNamespace = require('continuation-local-storage').createNamespace,
    logging = require('../lib'),
    sinks = require('../lib/sinks'),
    namespace = createNamespace('express-example'),
    app;

// This is a pretty awful monkey-patch of the createRecord. There should be a
// better way of doing this supported by the library
(function patchCreateRecord() {
    var origCreateRecord = logging.Logger.prototype.createRecord;
    logging.Logger.prototype.createRecord = function () {
        record = origCreateRecord.apply(this, arguments);
        record.transactionId = namespace.get('continuationId');
        return record;
    }
}());

// Configure a logger that writes records to the console with their associated
// transaction id
logging.getLogger('access').addSink(sinks.console(function (record) {
    return record.transactionId + ' - ' + record.getMessage();
}));

// Construct a express application with a middleware to configure an id for
// each request in the cls
app = express();
app.use(assignId(namespace));
app.get('/test', function (req, res, next) {
    var logger = logging.getLogger('access');
    logger.info("processing request");
    setTimeout(function () {
        logger.info("request processed");
        res.send(200, "zoidberg");
    }, 2000);
});

app.listen(4000);
console.log("listening on 4000, try running a command like")
console.log("http http://localhost:4000/test & http http://localhost:4000/test");
