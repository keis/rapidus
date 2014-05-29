"use strict";

/**
 * Record
 *  A single log event, contains message and additional details
 *
 * Formatter
 *  Formats a `Record` to a string, used by Sink
 *
 * Sink
 *  Append log event to specific destination
 *  Uses attached formatter to format record
 *  Can filter log events to include
 *
 * Logger
 *  A logging namespace in a logging hierarchy
 *  Can have multiple `Sink`s attached
 *  Can have multiple `Processor`s attached
 *  Can filter log events to propagate
 *
 * Hierarchy
 *  A hierarchy of loggers
 */

var util = require('util');

function extend(to, from) {
    from.forEach(function (el) { to.push(el); });
    return to;
}

function defaultFormat(record) {
    return record.getMessage();
}

function defaultWrite(record) {
    process.stderr.write(this.format(record) + "\n");
}

function Record(name, level, time, msg, args) {
    this.name = name;
    this.level = level;
    this.time = time;
    this.msg = msg;
    this.args = args;
}

Record.prototype.getMessage = function () {
    if (this.args === null) {
        return this.msg;
    }
    this.msg = util.format.apply(null, extend([this.msg], this.args));
    this.args = null;
    return this.msg;
}

function Sink(write, format, level) {
    this.write = write || defaultWrite;
    this.format = format || defaultFormat;
    this.level = level;
}

Sink.prototype.handle = function (record) {
    this.write.call(this, record);
}

function Hierarchy(root) {
    this.root = root;
    this.loggers = {};
}

Hierarchy.prototype.getLogger = function (name) {
    var loggers = this.loggers,
        logger = loggers[name],
        root = this.root,
        placeholder;

    function fixParents() {
        var key = name,
            idx,
            obj,
            parent;

        idx = key.lastIndexOf('.');
        while (idx > 0) {
            key = key.substring(0, idx);
            obj = loggers[key]
            if (!obj) {
                loggers[key] = new PlaceHolder(logger);
            } else if (obj instanceof PlaceHolder) {
                obj.add(logger);
            } else {
                parent = obj;
                break;
            }
            idx = key.lastIndexOf('.');
        }

        if (!parent) {
            parent = root;
        }

        logger.parent = parent;
    }

    function fixChildren() {
        var child,
            i;
        for (i = 0; i < placeholder.loggers.length; i++) {
            child = placeholder.loggers[i];
            if (child.parent.name.substring(name.length) !== name) {
                child.parent = logger;
            }
        }
    }

    if (!logger) {
        logger = loggers[name] = new Logger(name);
        fixParents();
    } else if (logger instanceof PlaceHolder) {
        placeholder = logger;
        logger = loggers[name] = new Logger(name);
        fixParents();
        fixChildren();
    }

    return logger;
}

function Logger(name, level) {
    this.name = name;
    this.level = level;
    this.sinks = [];
}

function PlaceHolder(logger) {
    this.loggers = [logger];
}

PlaceHolder.prototype.add = function (logger) {
    this.loggers.push(logger);
}

Logger.prototype.getEffectiveLevel = function () {
    var logger = this;

    do {
        if (logger.level) {
            return logger.level;
        }
    } while (logger = logger.parent);

    return 0;
}

Logger.prototype.isEnabledFor = function (level) {
    return level >= this.getEffectiveLevel();
}

Logger.prototype.createRecord = function (level, msg, args) {
    var time = Date.now();

    return new Record(this.name, level, time, msg, args);
}

Logger.prototype.importRecord = function (record) {
    return new Record(record.name,
                      record.level,
                      new Date(record.time),
                      record.msg,
                      record.args);
}

Logger.prototype.callSinks = function (record) {
    var sink,
        i;
    for (i = 0; i < this.sinks.length; i++) {
        sink = this.sinks[i];
        if (record.level >= (sink.level || 0)) {
            sink.handle(record);
        }
    }
}

Logger.prototype.dispatch = function (record) {
    var logger = this;
    do {
        logger.callSinks(record);
    } while ((logger = logger.parent));
}

Logger.prototype.log = function () {
    var args = Array.prototype.slice.call(arguments),
        level = args.shift(),
        msg = args.shift(),
        record;

    if (!this.isEnabledFor(level)) {
        return;
    }

    record = this.createRecord(level, msg, args);

    if (this.hier.proxy) {
        this.hier.proxy.sendRecord(record);
    }

    this.dispatch(record);

}

Logger.prototype.addSink = function (sink) {
    if (!(sink instanceof Sink)) {
        sink = new Sink(sink);
    }
    this.sinks.push(sink);
}

Logger.prototype.root = new Logger('root', 20);
Logger.prototype.hier = new Hierarchy(Logger.prototype.root);

module.exports.Sink = Sink;
module.exports.Hierarchy = Hierarchy;
module.exports.Record = Record;
module.exports.Logger = Logger;
module.exports.getLogger = function (name) {
    var hier = Logger.prototype.hier;
    return hier.getLogger(name);
}
