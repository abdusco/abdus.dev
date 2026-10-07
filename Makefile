.PHONY: build serve data

data:
	python3 scripts/updated.py

build: data
	SITE_ENV=production kopkop build
	python3 scripts/redirects.py

serve: data
	kopkop serve --port 8080 --open
