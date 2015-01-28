
suite 'rapidus.format', ->
    {createFormatter} = require '../lib/sinks'

    record =
        foo: 'foo-text'
        bar: 'bar-text'
        level: -> 'WARNING'

    set 'iterations', 100000

    simple = createFormatter ':foo'
    complex = createFormatter '[:foo] :bar :level'
    big = createFormatter '-:foo-:bar-:foo-:foo-:bar-:foo-:bar-:foo-:bar'

    bench 'simple attribute', ->
        simple record

    bench 'complex format string', ->
        complex record

    bench 'big format string', ->
        big record
