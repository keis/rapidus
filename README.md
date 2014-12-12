# rapidus

[![NPM Version][npm-image]](https://npmjs.org/package/rapidus)
[![Build Status][travis-image]](https://travis-ci.org/keis/rapidus)
[![Coverage Status][coveralls-image]](https://coveralls.io/r/keis/rapidus?branch=master)

A logging package that does the essentials.

> Something changed that's not your face

> it's mine!

# Partners in crime

A [connect middleware](https://github.com/keis/rapidus-connect-logger) that generates an access log

Colourful logging with [sparkle](https://github.com/keis/rapidus-sparkle)

A module to [configure your logger](https://github.com/keis/rapidus-configure) from JSON, Yaml etc

# Examples

Basic usage is very similiar to `log4js` or python's `logging` module

    logger = require('rapidus').getLogger('myapp.network');

    logger.debug('connecting to %s', host)
    logger.error('failed to connect', err);

For more involved examples see the [examples repository](https://github.com/keis/rapidus-examples)

# Core concepts

Record
 - A single log event, contains message and additional details

Formatter
 - Formats a `Record` to a string, used by Sink

Processor
 - Applied to log record to add extra data before being given to the sinks

Sink
 - Append log event to specific destination
 - Uses attached formatter to format record
 - Can filter log events to include

Logger
 - A named logger within in a logging hierarchy
 - Can have multiple `Sink`s attached
 - Can have multiple `Processor`s attached
 - Can filter log events to propagate

Hierarchy
 - A hierarchy of loggers

[npm-image]: https://img.shields.io/npm/v/rapidus.svg?style=flat
[travis-image]: https://img.shields.io/travis/keis/rapidus.svg?style=flat
[coveralls-image]: https://img.shields.io/coveralls/keis/rapidus.svg?style=flat
