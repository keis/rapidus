ISTANBUL=node_modules/.bin/istanbul
MOCHA=node_modules/.bin/_mocha
DOCCO=node_modules/.bin/docco

SRC=$(shell find lib/ -type f)
TESTSRC=$(shell find test/ -type f)
DOCS=$(patsubst lib/%.js, docs/%.html, $(SRC))

all: test docs

.PHONY: test docs

test: coverage/coverage.json

docs: $(DOCS)

docs/%.html: lib/%.js
	docco $^

coverage/coverage.json: $(SRC) $(TESTSRC)

coverage/coverage.json:
	$(ISTANBUL) cover $(MOCHA) -- --require test/bootstrap.js --compilers coffee:coffee-script/register --recursive test/unit

coverage/lcov.info: coverage/coverage.json
	$(ISTANBUL) report lcov

coverage/index.html: coverage/coverage.json
	$(ISTANBUL) report html
