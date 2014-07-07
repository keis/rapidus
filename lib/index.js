// A logging package that does the essentials.

// This main module mainly deals with the abstract model of logging and takes
// care of creating logger sources and routing log records through a hierarchy
// of loggers. The details that involve streams, bytes and heavy string
// interpolation is handed over to the `sinks` and `proxy` modules.
var util = require('util'),
    proxy = require('./proxy'),
    sinks = require('./sinks'),
    levels = require('./levels'),
    Sink = sinks.Sink,
    logLevels = levels.levels,
    levelNames = levels.names,
    defaultHierarchy;

// # Record

// Constructor for log records, will be created by the individual loggers and
// passed to the sinks for writing. `msg` can be a `util.format` style format
// string and will be formatted using `args`
function Record(name, level, time, msg, args) {
    if (level === void 0 && name.constructor === Object) {
        util._extend(this, name);
    } else {
        this.name = name;
        this.level = level;
        this.time = time;
        this.msg = msg;
        this.args = args;
   }
}

// Bind the level name map to the prototype to power `getLevelName`
Record.prototype.levelNames = levelNames;

// Get the symbolic name of the level by looking it up in the map
Record.prototype.getLevelName = Record.prototype.levelName = function () {
    return this.levelNames[this.level];
}

// Get the message by combining the message format and `args`
Record.prototype.getMessage = Record.prototype.message = function () {
    if (this.args === null) {
        return this.msg;
    }

    var args = this.args.slice();
    args.unshift(this.msg);

    // Format the message and cache as the new `msg` attribute. By unsetting
    // `args` any later calls are short circuited
    this.msg = util.format.apply(null, args);
    this.args = null;

    return this.msg;
}

// # Hierarchy

// Constructor for a hierarchical register of loggers
function Hierarchy(root) {
    this.root = root;
    this.loggers = {};
    this.defaultProcessors = []
}

// Get logger instance by name
Hierarchy.prototype.getLogger = function (name) {
    // If the logger is already created it can be found in the `loggers`
    // directory by the full-name
    var loggers = this.loggers,
        logger = loggers[name],
        root = this.root,
        placeholder;

    // Make sure each node higher up in the hierarchy is accounted for by
    // creating placeholders where real loggers are missing.
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

        // Set the parent of the current logger to the first logger found or to
        // the root logger if none is found in hierarchy.
        if (!parent) {
            parent = root;
        }
        logger.parent = parent;
    }

    // Cleanly replace a placeholder with a real logger by setting the parent
    // of all the children
    function fixChildren() {
        var child,
            i;
        for (i = 0; i < placeholder.loggers.length; i++) {
            child = placeholder.loggers[i];
            // A sanity check that was present in python logging, the
            // attributes of a case that triggers this is still unclear
            if (child.parent.name.substring(0, name.length) !== name) {
                child.parent = logger;
            }
        }
    }

    // When no name is given return the root logger
    if (!name) {
        logger = root;

    // When nothing is in the registry simply create a new logger
    } else if (!logger) {
        logger = loggers[name] = this.createLogger(name);
        fixParents();

    // When replacing a placeholder make sure to clean up the child loggers
    } else if (logger instanceof PlaceHolder) {
        placeholder = logger;
        logger = loggers[name] = this.createLogger(name);
        fixParents();
        fixChildren();
    }

    return logger;
}

// Create a new logger and attach all the default processors
Hierarchy.prototype.createLogger = function (name) {
    var logger = new Logger(this, name),
        processors = this.defaultProcessors,
        i;

    for (i = 0; i < processors.length; i++) {
        logger.addProcessor(processors[i]);
    }

    return logger;
}

// Add a new default processor, this needs to be done before any logger is
// created
Hierarchy.prototype.addDefaultProcessor = function (processor) {
    this.defaultProcessors.push(processor);
}

// Creates a new hierarchy with only a root logger. This is used below to
// create the default hierarchy but can also be used to create isolated
// hierarchies for testing etc.
function createHierarchy() {
    var hier = new Hierarchy(new Logger(null, 'root', 20));
    hier.root.hier = hier;
    return hier;
}

// # Placeholder

// Constructor for logger placeholder that holds a list of child loggers that
// may need to be patched at a later time.
function PlaceHolder(logger) {
    this.loggers = [logger];
}

// Add a logger to the list of children
PlaceHolder.prototype.add = function (logger) {
    this.loggers.push(logger);
}

// # Logger

// Constructor for logger instance that is to be part of the `hier`.  The
// parent attribute is maintained by the hierarchy and may be changed during
// the lifetime of the logger.
function Logger(hier, name, level) {
    this.hier = hier;
    this.parent = null;
    this.name = name;
    this.sinks = [];
    this.processors = [];
    this.setLevel(level);
}

// It's possible to change the level of a logger by either numeric level or its
// symbolic name.
Logger.prototype.setLevel = levels.setLevel;

// The effective level of a logger is found by walking up the hierarchy until a
// instance with a level defined is found.
Logger.prototype.getEffectiveLevel = function () {
    var logger = this;

    do {
        if (logger.level) {
            return logger.level;
        }
    } while ((logger = logger.parent));

    return 0;
}

// Check if records of the given level should be processed by this logger
Logger.prototype.isEnabledFor = function (level) {
    return level >= this.getEffectiveLevel();
}

// Used internally to create new log records and could be patched from the
// outside to provide extra data on the record instance.
Logger.prototype.createRecord = function (level, msg, args) {
    var time = new Date(),
        record = new Record(this.name, level, time, msg, args),
        processor,
        i;

    for (i = 0; i < this.processors.length; i++) {
        processor = this.processors[i];
        processor.call(this, record);
    }

    return record;
}

// A special case of log record creating for records being imported from
// another system that need to have all the details intact.
Logger.prototype.importRecord = function (record) {
    data = util._extend({}, record);
    data.time = new Date(record.time);

    return new Record(data);
}

// Dispatch a record through all the sinks attached to a logger. This will be
// called for all parent loggers in the hierarchy when a record is accepted
// downstream.
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

// Dispatch a record to this logger and all of its parents
Logger.prototype.dispatch = function (record) {
    var logger = this;
    do {
        logger.callSinks(record);
    } while ((logger = logger.parent));
}

// Create a log record from all arguments and process it
Logger.prototype.log = function () {
    var args = Array.prototype.slice.call(arguments),
        level = args.shift(),
        msg = args.shift(),
        record;

    if (isNaN(level)) {
        level = logLevels[level]
    }

    // Log level is only checked at the called logger and whatever is
    // configured in the parent is ignored
    if (!this.isEnabledFor(level)) {
        return;
    }

    record = this.createRecord(level, msg, args);

    // Send record over proxy if one is configured. Any local sinks will still
    // be processed.
    if (this.hier.proxy) {
        this.hier.proxy.sendRecord(record);
    }

    this.dispatch(record);

}

// Add a log record sink to the logger. It's possible to call this with a plain
// function and it will be wrapped instance with the default formatter and the
// given function as the write function.
Logger.prototype.addSink = function (sink) {
    if (!(sink instanceof Sink)) {
        sink = new Sink(sink);
    }
    this.sinks.push(sink);
}

// Add a record processor to the logger that will be called with each new
// record before being dispatched to the sinks.
Logger.prototype.addProcessor = function (proc) {
    this.processors.push(proc);
}

// Create wrapper functions for all defined log levels
Object.keys(logLevels).forEach(function (name) {
    var level = logLevels[name];

    Logger.prototype[name.toLowerCase()] = function () {
        var args = Array.prototype.slice.call(arguments);

        args.unshift(level);

        this.log.apply(this, args);
    };
});

// # Exports

// Setup a default hierarchy used by the simplified interface
defaultHierarchy = createHierarchy();

// Export constructors
module.exports.Sink = Sink;
module.exports.Hierarchy = Hierarchy;
module.exports.Record = Record;
module.exports.Logger = Logger;

// Create a new hierarchy
module.exports.createHierarchy = createHierarchy;

// Create a format function for a given pattern
module.exports.createFormatter = sinks.createFormatter;

// Get a logger from the default hierarchy
module.exports.getLogger = function (name) {
    return defaultHierarchy.getLogger(name);
}

// Add a default processor to the default hierarchy
module.exports.addDefaultProcessor = function (proc) {
    defaultHierarchy.addDefaultProcessor(proc);
}

// Check if the environment indicates a log record proxy is available
module.exports.isProxyAvailable = proxy.isAvailable;

// Enable the proxy configured in the environment on the default hierarchy
module.exports.enableProxy = function (path) {
    defaultHierarchy.proxy = proxy.createClient(path);
}

// Create a log record proxy server
module.exports.createProxy = function (path) {
    return proxy.createServer(path, defaultHierarchy);
}
