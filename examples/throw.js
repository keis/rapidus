var logger = require('../lib').getLogger(),
    sinks = require('../lib/sinks');

logger.addSink(sinks.console());

function CustomError(message) {
    this.message = message;
    Error.captureStackTrace(this, CustomError);
}

CustomError.prototype = Object.create(Error.prototype);
CustomError.prototype.constructor = CustomError;
CustomError.prototype.name = CustomError.name;

function foo(idx) {
    if (idx > 0) {
        foo(idx - 1);
    } else {
        throw new CustomError('error message');
    }
}

function main() {
    try {
        foo(4);
    } catch (err) {
        logger.error('an error occured', err);
    }
}

main();
