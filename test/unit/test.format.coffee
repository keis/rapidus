{Record} = require '../../lib'
{Sink, createFormatter} = require '../../lib/sinks'

describe "createFormatter", ->
    record = new Record 'access', 10, new Date, "%s - %s", ['foo', 10]
    record.headers =
        'content-length': '500',
        'content-type': 'application/json'

    it "creates a format function", ->
        frmt = createFormatter ':message'
        assert.isFunction frmt

    it "resolves simple attributes", ->
        frmt = createFormatter ':level:name'
        str = frmt record
        assert.equal str, '10access'

    it "calls attributes that are resolved to functions", ->
        frmt = createFormatter ':levelName :message'
        str = frmt record
        assert.equal str, 'DEBUG foo - 10'

describe "defaultFormatter", ->
    record = new Record 'access', 10, new Date, "%s - %s", ['foo', 10]
    sink = new Sink
    str = sink.format record
    # Starts with a timestamp but that's ignored by the assert
    assert.match str, /.* - DEBUG - foo - 10/
