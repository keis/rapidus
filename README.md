# no name yet
A logging package that does the essentials.

# Core concepts

Record
 - A single log event, contains message and additional details

Formatter
 - Formats a `Record` to a string, used by Sink

Sink
 - Append log event to specific destination
 - Uses attached formatter to format record
 - Can filter log events to include

Logger
 - A named logger within in a logging hierarchy
 - Can have multiple `Sink`s attached
 - Can filter log events to propagate

Hierarchy
 - A hierarchy of loggers

