---
title: TrickleBar
description: A menu app for macOS to manage downloads with aria2
date: 2026-10-12
taxonomies:
  tags: [app, macos]
---


<div class="app-logo"><img src="./tricklebar.svg" alt="TrickleBar Logo"></div>

<style>
.app-logo {
    width: 8rem;
    height: 8rem;
    margin-bottom: 2rem;
}
</style>

TrickleBar is a menu app based on [aria2][aria2] that provides a minimal interface to view and manage your downloads.
It requires aria2 to be installed and available in `$PATH`. It has a minimal settings panel to configure aria2 options. It has a CLI interface that passes the arguments to aria2c. 

{{ github_repo(repo="abdusco/tricklebar") }}

It listens to `tricklebar://` URLs to add downloads. You can even specify which script to run when a download is done. I use it to automatically move the downloaded file to the right folder and show a notification, for example.

```bash
url="$1"
encoded=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$url")
open "tricklebar://add-download?on_done=$HOME/bin/aria2_on_done.py&url=$encoded"
```

You can download the [latest version] from GitHub.

[latest version]: https://github.com/abdusco/tricklebar/releases/latest
[aria2]: https://aria2.github.io/
