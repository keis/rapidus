// Map level names to numeric levels
module.exports.levels = logLevels = {
    'CRITICAL' : 50,
    'ERROR' : 40,
    'WARN' : 30,
    'WARNING' : 30,
    'INFO' : 20,
    'DEBUG' : 10
}

// Map numeric levels to level name
module.exports.names = levelNames = {
    50 : 'CRITICAL',
    40 : 'ERROR',
    30 : 'WARNING',
    20 : 'INFO',
    10 : 'DEBUG',
}

module.exports.setLevel = function (level) {
    if (isNaN(level) && level != void 0) {
        level = logLevels[level.toUpperCase()];
    }
    this.level = level;
};
