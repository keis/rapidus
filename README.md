# rapidus
A logging package that does the essentials.

> Something changed that's not your face

> it's mine!

# Partners in crime

A [connect middleware that generates an access log](https://github.com/keis/rapidus-connect-logger)
Colourful logging with [sparkle](https://github.com/keis/rapidus-sparkle)

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

