---
title: htmlpopup
description: A simple webview popup utility for macOS
date: 2026-10-10
taxonomies:
  tags: [app, macos]
---

<div class="htmlpopup-icon"><img src="./htmlpopup-icon.svg" alt="htmlpopup app icon"/></div>

<style>
.htmlpopup-icon {
    width: 8rem;
    height: 8rem;
    margin-bottom: 2rem;
}
</style>

htmlpopup is a simple utility for macOS that allows you to open up an HTML page in a popup window. It provides a JS API to control the window, interact with the filesystem, returning values to the caller on exit etc. You can call it with a URL, or a local HTML file, or a directory, or an HTML literal or pipe HTML to it. It supports `localStorage` as well.

{{ github_repo(repo="abdusco/htmlpopup") }}


I built it to show basic UIs for other utilities, e.g. one for having an AI chat window, or a grammar checker, or a UI in front of a UI. You can inject environment variables and other data into the webview (accessible via `window.env.*`). 

For example, this is how I use it for the AI chat:

```bash
htmlpopup --id chat --env.PROMPT "$1" \
  --env.GEMINI_API_KEY $GEMINI_API_KEY \
  --env.OPENAI_API_KEY $OPENAI_API_KEY \
  --env.ANTHROPIC_API_KEY $ANTHROPIC_API_KEY ~/dev/web/chat
```

where `$1` is the currently selected text (populated by Alfred on a hotkey press). 

In another use case, I wrap it in python to use an API + HTML served by that script:

```python
@contextlib.contextmanager
def run_htmlpopup(address: str):
    exe_path = shutil.which("htmlpopup")
    if not exe_path:
        raise RuntimeError("htmlpopup executable not found in PATH.")
    proc = subprocess.Popen([exe_path, "--title", "search", address], text=True, stdout=subprocess.PIPE)
    try:
        yield
        proc.wait()
    finally:
        proc.terminate()

# ...
with api.serve(port=port) as server_url:
    logging.info(f"Server running at {server_url}")
    with run_htmlpopup(server_url):
        logging.info("HTML popup started. Press Ctrl+C to stop.")
```


Check out [JS API documentation][readme] for more details. Download the latest release from the [Github releases page][latest_version].

[readme]: https://github.com/abdusco/htmlpopup#readme
[latest_version]: https://github.com/abdusco/htmlpopup/releases/latest
