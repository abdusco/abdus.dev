---
title: kuller
description: Minimal image culling app for macOS.
date: 2026-10-11
taxonomies:
  tags: [app, macos]
---

<div class="app-logo"><img src="./kuller-icon.svg" alt="kuller app icon"></div>

<style>
.app-logo {
    width: 8rem;
    height: 8rem;
    margin-bottom: 2rem;
}
</style>

kuller is an image culling app to quickly weed out bad photos and keep the best ones. It is designed to be minimal. It has a canvas window like Photoshop, and a side panel with a filmstrip of all the images in the current folder. You can quickly go through the images and mark them as keep or discard, or crop them in various aspect ratios using hotkeys. 

{{ github_repo(repo="abdusco/kuller") }}

I built it to get ahead of my ever-growing pile of photos and I didn't like Lightroom's interface to do it. The first iteration was built as a web app backed by golang. I found myself using it quote often, so I decided to turn it into a native macOS app. 

It has a minimal interface, and a settings panel to customize the hotkeys. It offers a CLI interface which is how I use it. 

You can download [the latest version][download] on GitHub.

[download]: https://github.com/abdusco/kuller/releases/latest
