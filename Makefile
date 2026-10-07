.PHONY: build serve

build:
	SITE_ENV=production kopkop build
	python3 scripts/redirects.py

serve:
	kopkop serve --port 8080 --open
