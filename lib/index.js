// A logging package that does the essentials.

// This main module mainly deals with the abstract model of logging and takes
// care of creating logger sources and routing log records through a hierarchy
// of loggers. The details that involve streams, bytes and heavy string
// interpolation is handed over to the `sinks` and `proxy` modules.
var Sink = require('record-sink')
  , Record = require('log-record')
  , Logger = require('mlogy')
  , createFormatter = require('dullstring')
  , proxy = require('./proxy')
  , sinks = require('./sinks')
  , defaultHierarchy

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
    logger = this.createLogger(name)
    this.manageLogger(logger)

  // When replacing a placeholder make sure to clean up the child loggers
  } else if (logger instanceof PlaceHolder) {
    placeholder = logger
    logger = this.createLogger(name)
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

  loggers[logger.name] = logger
  logger.context = this
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
  hier.root.context = hier
  return hier
}

// # PlaceHolder

// Constructor for logger placeholder that holds a list of child loggers that
// may need to be patched at a later time.
function PlaceHolder(logger) {
  this.push(logger)
}
PlaceHolder.prototype.push = Array.prototype.push

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
module.exports.createFormatter = createFormatter

// Get a logger from the default hierarchy
module.exports.getLogger = function (name) {
  return defaultHierarchy.getLogger(name)
}

// Add a logger to the default hierarchy
module.exports.manageLogger = function (logger) {
  defaultHierarchy.manageLogger(name)
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
