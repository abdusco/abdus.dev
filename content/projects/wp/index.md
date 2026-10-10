---
title: wp
description: A minimal macOS wallpaper switcher with blur effect.
date: 2026-10-13
taxonomies:
  tags: [app, macos]
---

<div class="app-logo"><img src="wp-icon.svg" alt="wp app icon"/></div>

<style>
.app-logo {
    width: 8rem;
    height: 8rem;
    margin-bottom: 2rem;
}
</style>

wp is a menu app that offers a minimal wallpaper switcher. It lets you cycle through your favorite wallpapers on a timeout or with a hotkey. It applies a blur effect and lets you reveal the image with double click on the desktop. 

{{ github_repo(repo="abdusco/wp") }}

It can also stack multiple portrait images side-by-side to create a collage wallpaper. It has a settings panel to configure the hotkeys, auto-cycle timeout, HTTP API port, and other options.

{% gallery(label="wp screenshots") %}
<img src="./wp-menu.png" alt="wp menu app screenshot" loading="lazy">
<img src="./wp-settings.png" alt="wp settings panel screenshot" loading="lazy">
<img src="./wp-sources.png" alt="wp settings panel screenshot" loading="lazy">
<img src="./wp-hotkeys.png" alt="wp settings panel screenshot" loading="lazy">
{% end %}

The HTTP server is meant for remote control, which you can activate by specifying a `PORT` environment variable or in the settings panel. You can use `curl` to send commands to it e.g. with Alfred on a hotkey press.

```bash
PORT=9876 ~/bin/wp ~/Pictures/wallpapers/
curl localhost:9876/next # Next image
curl localhost:9876/prev # Previous image
curl localhost:9876/blur # Toggle blur
```
