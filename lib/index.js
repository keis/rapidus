// A logging package that does the essentials.

// This main module mainly deals with the abstract model of logging and takes
// care of creating logger sources and routing log records through a hierarchy
// of loggers. The details that involve streams, bytes and heavy string
// interpolation is handed over to the `sinks` and `proxy` modules.
var util = require('util')
  , dateFormat = require('dateformat')
  , proxy = require('./proxy')
  , sinks = require('./sinks')
  , levels = require('./levels')
  , Sink = sinks.Sink
  , logLevels = levels.levels
  , levelNames = levels.names
  , defaultHierarchy

// # Record

// Constructor for log records. Instances are created by the individual loggers
// and passed through the hierarchy to the sinks for writing. A record consist
// of the `name` of the origin, the log `level`, a `timstamp` and a message.
// `msg` may be a `util.format` style format string and will be combined with
// `args` to format the message. Processors may attach additional attributes to
// the record.
function Record(name, level, timestamp, msg, args) {
  if (level === void 0 && name.constructor === Object) {
    util._extend(this, name)
  } else {
    this.name = name
    this.level = level
    this.timestamp = timestamp
    this.msg = msg
    this.args = args
  }
}

// `getLevelName` returns the symbolic name of the level by looking it up in
// the level name map that is bound to the prototype.
Record.prototype.levelNames = levelNames
Record.prototype.getLevelName = Record.prototype.levelName = function () {
  return this.levelNames[this.level]
}

// Get the time part of the timestamp formatted as a ISO-8601 string
Record.prototype.getTime = Record.prototype.time = function () {
  return dateFormat(this.timestamp, 'HH:MM:ss.l')
}

// Get the date part of the timestamp formatted as a ISO-8601 string
Record.prototype.getDate = Record.prototype.date = function () {
  return dateFormat(this.timestamp, 'yyyy-mm-dd')
}

// Get the message by combining the message format and `args`. Any error
// objects in `args` are wrapped with a custom `inspect` method to provide
// better stack traces and inline formatting.  `msg` is replace with the
// formatted message and `args` is set to `null` to indicate that the record
// holds a cached value of the final message.
Record.prototype.getMessage = Record.prototype.message = function () {
  if (this.args === null) {
    return this.msg
  }

  var args = this.args.map(function (v) {
    if (v instanceof Error && v.stack) {
      return { inspect: function () { return v.stack }
             , toString: function () { return v.toString() }
             }
    }
    return v
  })

  args.unshift(this.msg)
  this.msg = util.format.apply(null, args)
  this.args = null

  return this.msg
}

// # Hierarchy

// Constructor for a hierarchical register of loggers. Usually only the global
// hierarchy exposed through the method of this module is used but independent
// hierarchies can be created.
function Hierarchy(root) {
  this.root = root
  this.loggers = {}
  this.defaultProcessors = []
}

// Get logger instance by name
Hierarchy.prototype.getLogger = function (name) {
  // If the logger is already created it can be found in the `loggers`
  // directory by the full-name
  var loggers = this.loggers
    , logger = loggers[name]
    , placeholder

  // When no name is given return the root logger
  if (!name) {
    logger = this.root

  // When nothing is in the registry simply create a new logger
  } else if (!logger) {
    logger = loggers[name] = this.createLogger(name)
    this.manageLogger(logger)

  // When replacing a placeholder make sure to clean up the child loggers
  } else if (logger instanceof PlaceHolder) {
    placeholder = logger
    logger = loggers[name] = this.createLogger(name)
    this.manageLogger(logger, placeholder)
  }

  return logger
}

// This method is used to establish the position of a logger within the
// hierarchy. If the logger is replacing a placeholder it should be given as
// the second argument for the child loggers to be adjusted.
Hierarchy.prototype.manageLogger = function (logger, placeholder) {
  var loggers = this.loggers
    , root = this.root
    , name = logger.name

  if (name === void 0) {
    throw new Error('Attempt to manage logger without name')
  }

  // Make sure each node higher up in the hierarchy is accounted for by
  // creating placeholders where real loggers are missing.
  function fixParents() {
    var key = name
      , idx
      , obj
      , parent

    idx = key.lastIndexOf('.')
    while (idx > 0) {
      key = key.substring(0, idx)
      obj = loggers[key]
      if (!obj) {
        loggers[key] = new PlaceHolder(logger)
      } else if (obj instanceof PlaceHolder) {
        obj.push(logger)
      } else {
        parent = obj
        break
      }
      idx = key.lastIndexOf('.')
    }

    // Set the parent of the current logger to the first logger found or to
    // the root logger if none is found in hierarchy.
    if (!parent) {
      parent = root
    }
    logger.parent = parent
  }

  // Cleanly replace a placeholder with a real logger by setting the parent
  // of all the children
  function fixChildren() {
    var child
      , length
      , i

    for (i = 0, length = placeholder.length; i < length; i++) {
      child = placeholder[i]
      // A sanity check that was present in python logging, the
      // attributes of a case that triggers this is still unclear
      if (child.parent.name.substring(0, name.length) !== name) {
        child.parent = logger
      }
    }
  }

  fixParents()
  if (placeholder) {
    fixChildren()
  }
}

// Create a new logger
Hierarchy.prototype.createLogger = function (name) {
  return new Logger(this, name)
}

// Add a new default processor, this needs to be done before any logger is
// created
Hierarchy.prototype.addDefaultProcessor = function (processor) {
  this.defaultProcessors.push(processor)
}

// Apply a function to each sink that is part of the hierarchy. The function
// will only be called once for each sink even if it occurs multiple times
// throughout the hierarchy.
Hierarchy.prototype.forEachSink = function (iteratee) {
  var loggers = this.loggers
    , uniq = []
    , sinks
    , length
    , sink
    , k
    , i

  // Assemble a list of all unique sinks in the hierarchy
  for (k in loggers) {
    if (loggers.hasOwnProperty(k) && (sinks = loggers[k].sinks)) {
      for (i = 0, length = sinks.length; i < length; i++) {
        sink = sinks[i]

        if (uniq.indexOf(sink) < 0) {
          uniq.push(sink)
        }
      }
    }
  }

  uniq.forEach(iteratee)
}

// Reset all the sinks of the loggers attached to the hierarchy
Hierarchy.prototype.resetSinks = function () {
  this.forEachSink(function (sink) {
    if (typeof sink.reset === 'function') {
      sink.reset()
    }
  })
}

// Creates a new hierarchy with only a root logger. This is used below to
// create the default hierarchy but can also be used to create isolated
// hierarchies for testing etc.
function createHierarchy() {
  var hier = new Hierarchy(new Logger(null, 'root', 20))
  hier.root.hier = hier
  return hier
}

// # PlaceHolder

// Constructor for logger placeholder that holds a list of child loggers that
// may need to be patched at a later time.
function PlaceHolder(logger) {
  this.push(logger)
}
PlaceHolder.prototype.push = Array.prototype.push


// # Logger

// Constructor for logger instance that is to be part of the `hier`.  The
// parent attribute is maintained by the hierarchy and may be changed during
// the lifetime of the logger.
function Logger(hier, name, level) {
  this.hier = hier
  this.parent = null
  this.name = name
  this.sinks = []
  this.processors = []
  this.propagate = true
  this.setLevel(level)
}

// It's possible to change the level of a logger by either numeric level or its
// symbolic name.
Logger.prototype.setLevel = levels.setLevel

// The effective level of a logger is found by walking up the hierarchy until a
// instance with a level defined is found.
Logger.prototype.getEffectiveLevel = function () {
  var logger = this

  do {
    if (logger.level) {
      return logger.level
    }
  } while ((logger = logger.parent))

  return 0
}

// Check if records of the given level should be processed by this logger
Logger.prototype.isEnabledFor = function (level) {
  return level >= this.getEffectiveLevel()
}

// Used internally to create new log records and could be patched from the
// outside to provide extra data on the record instance.
Logger.prototype.createRecord = function (level, msg, args) {
  var timestamp = new Date()
    , record = new Record(this.name, level, timestamp, msg, args)

  if (this.hier.defaultProcessors) {
    this.hier.defaultProcessors.forEach(function (processor) {
      processor.call(this, record)
    })
  }

  if (this.processors) {
    this.processors.forEach(function (processor) {
      processor.call(this, record)
    })
  }

  return record
}

// A special case of log record creating for records being imported from
// another system that need to have all the details intact.
Logger.prototype.importRecord = function (record) {
  var data = util._extend({}, record)
  data.timestamp = new Date(record.timestamp)

  return new Record(data)
}

// Dispatch a record through all the sinks attached to a logger. This will be
// called for all parent loggers in the hierarchy when a record is accepted
// downstream.
Logger.prototype.callSinks = function (record) {
  var sink
    , length
    , i

  for (i = 0, length = this.sinks.length; i < length; i++) {
    sink = this.sinks[i]
    if (record.level >= (sink.level || 0)) {
      sink.handle(record)
    }
  }
}

// Dispatch a record to this logger and all of its parents
Logger.prototype.dispatch = function (record) {
  var logger = this
  do {
    logger.callSinks(record)
  } while (logger.propagate && (logger = logger.parent))
}

// Create a log record from all arguments and process it
Logger.prototype.log = function () {
  var args = Array.prototype.slice.call(arguments)
    , level = args.shift()
    , msg = args.shift()
    , record

  if (isNaN(level)) {
    level = logLevels[level]
  }

  // Log level is only checked at the called logger and whatever is
  // configured in the parent is ignored
  if (!this.isEnabledFor(level)) {
    return
  }

  record = this.createRecord(level, msg, args)

  // Send record over proxy if one is configured. Any local sinks will still
  // be processed.
  if (this.hier.proxy) {
    this.hier.proxy.sendRecord(record)
  }

  this.dispatch(record)

}

// Add a log record sink to the logger. It's possible to call this with a plain
// function and it will be wrapped instance with the default formatter and the
// given function as the write function.
Logger.prototype.addSink = function (sink) {
  if (!(sink instanceof Sink)) {
    sink = new Sink(sink)
  }
  this.sinks.push(sink)
}

// Add a record processor to the logger that will be called with each new
// record before being dispatched to the sinks.
Logger.prototype.addProcessor = function (proc) {
  this.processors.push(proc)
}

// Create wrapper functions for all defined log levels
Object.keys(logLevels).forEach(function (name) {
  var level = logLevels[name]

  Logger.prototype[name.toLowerCase()] = function () {
    var args = Array.prototype.slice.call(arguments)

    args.unshift(level)

    this.log.apply(this, args)
  }
})

// # Exports

// Export sinks sub-module
module.exports.sinks = sinks

// Setup a default hierarchy used by the simplified interface
defaultHierarchy = createHierarchy()

// Export constructors
module.exports.Sink = Sink
module.exports.Hierarchy = Hierarchy
module.exports.Record = Record
module.exports.Logger = Logger
module.exports.PlaceHolder = PlaceHolder

// Create a new hierarchy
module.exports.createHierarchy = createHierarchy

// Create a format function for a given pattern
module.exports.createFormatter = sinks.createFormatter

// Get a logger from the default hierarchy
module.exports.getLogger = function (name) {
  return defaultHierarchy.getLogger(name)
}

// Add a default processor to the default hierarchy
module.exports.addDefaultProcessor = function (proc) {
  defaultHierarchy.addDefaultProcessor(proc)
}

// Reset the sinks of the default hierarchy
module.exports.resetSinks = function () {
  defaultHierarchy.resetSinks()
}

// Check if the environment indicates a log record proxy is available
module.exports.isProxyAvailable = proxy.isAvailable

// Enable the proxy configured in the environment on the default hierarchy
module.exports.enableProxy = function (path) {
  defaultHierarchy.proxy = proxy.createClient(path)
}

// Create a log record proxy server
module.exports.createProxy = function (path) {
  return proxy.createServer(path, defaultHierarchy)
}
