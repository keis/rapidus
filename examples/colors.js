// This example requires `rapidus-sparkle`
var logging = require('../lib'),
    sinks = require('../lib/sinks'),
    sparkle = require('rapidus-sparkle'),
    levelColors,
    frmt,
    logger;

// Configure a mapping between log levels and colors
levelColors = {
    'DEBUG': 'cyan',
    'WARNING': 'yellow',
    'ERROR': 'red'
};

// Create a sparkle formatter
frmt = sparkle.createFormatter({
    format: '%{green:time} %{:levelColor %{bold [:levelName]} :message}'
});

// Create a logger
logger = logging.getLogger('app');
logger.setLevel('DEBUG');
logger.addSink(sinks.console({format: frmt}));

// Assign a colour to each record based on the log level
logger.addProcessor(function (record) {
    record.levelColor = levelColors[record.levelName()];
})

// Log some stuff
logger.debug('some details');
logger.warn('this feels bad');
logger.error('abandon ship');
