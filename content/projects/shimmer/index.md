---
title: Shimmer
description: A live wallpaper app for Android with GPU-accelerated effects
date: 2026-10-09
taxonomies:
  tags: [app, android]
---

<div class="app-logo">{{ embed_file(path="./shimmer.svg") }}</div>

<style>
.app-logo {
    width: 8rem;
    height: 8rem;
    margin-bottom: 2rem;
}
.app-logo svg {
    width: 100%;
    height: 100%;
    fill: var(--c-accent);
}
</style>

Shimmer is a live wallpaper app for Android that lets you apply cool GPU-accelerated blur and duotone effects to your wallpapers.

{{ github_repo(repo="abdusco/shimmer") }}

I wanted to build this app ever since I first tried [Muzei][muzei] back in 2014. I loved the idea of a wallpaper app just that gets out of your way. I didn't know much about OpenGL, but with the help of AI, I was able to create one with GPU accelerated blur effects (with clever optimizations). It's been a fun project to work on, and I've been fixing the bugs as I come across them.

## Features 

- GPU accelerated gaussian blur and duotone effects.
- Chromatic aberration breathing effect on touch.
- Blur the wallpaper on lock, on timeout, or with a gesture.
- Many duotone color palettes to choose from, or you can pick your own colors.
- Cycle through your favorite wallpapers automatically on unlock or with a gesture.
- Marking wallpapers as favorites to easily find them later.
- Intent support for automation via Tasker or similar apps.

## Download

Currently only on Github, source if also available if you wanna build it yourself. I am not planning to put it on the Play Store, but you can download the APK from the [releases page][releases].

[muzei]: https://muzei.co/
[releases]: https://github.com/abdusco/shimmer/releases/latest
