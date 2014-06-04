var exec = require('child_process').exec;

module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        docco: {
            debug: {
                src: 'lib/*.js'
            }
        },
        watch: {
            lib: {
                files: 'lib/*.js',
                tasks: ['docco'],
                options: {interrupt: true}
            },
            scripts: {
                files: ['lib/*.js', '**/*.coffee'],
                tasks: ['coverage'],
                options: {interrupt: true}
            }
        }
    });

    grunt.registerTask('coverage', function () {
        var done = this.async(),
            proc = exec('node_modules/.bin/istanbul cover node_modules/.bin/_mocha -- --require test/bootstrap.js --compilers coffee:coffee-script/register --recursive test/unit');

        proc.stdout.on('data', function (chunk) { grunt.log.write(chunk); });
        proc.stderr.on('data', function (chunk) { grunt.log.write(chunk); });

        proc.on('exit', function (code) {
            if (code !== 0) {
                console.error('Exited with code: ', code)
                return done(false);
            }
            done()
        });
    });

    grunt.loadNpmTasks('grunt-docco');
    grunt.loadNpmTasks('grunt-contrib-watch');
};
