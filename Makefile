ISTANBUL=node_modules/.bin/istanbul
MOCHA=node_modules/.bin/_mocha

.PHONY: test coverage/coverage.json

test: coverage/coverage.json

coverage/coverage.json:
	$(ISTANBUL) cover $(MOCHA) -- --require test/bootstrap.js --compilers coffee:coffee-script/register --recursive test/unit

coverage/index.html: coverage/coverage.json
	$(ISTANBUL) report html
