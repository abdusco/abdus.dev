---
title: subbed
description: Create and translate subtitles for other people's Youtube videos, then watch them in your own language
date: 2026-10-20
taxonomies:
  tags: [pwa, app, youtube]
---

I've created this app to share videos with my friends who don't speak English. It lets you import a Youtube video, transcribe its audio into an SRT subtitle file, then translate it into different languages.

{{ github_repo(repo="abdusco/subbed") }}

It has a built-in player that overlays the subtitles on top of the video, so you can watch it as if the original creator had provided subtitles in your language. 

It uses [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) under the hood. So you have to copy over your Youtube cookies to download the audio. You can also upgrade it to the latest nightly build when the existing version stops working. 

The app also lets you use custom models from OpenRouter to transcribe the audio and translate the subtitles.

{% gallery() %}
<img src="./subbed_login.png" alt="login screen for the app" />
<img src="./subbed_library.png" alt="library view showing available videos and subtitles" />
<img src="./subbed_menu.png" alt="settings menu" />
<img src="./subbed_settings.png" alt="settings screen" />
<img src="./subbed_add.png" alt="popup for adding new videos" />
<video src="./subbed_transcript.mp4" controls playsinline preload="metadata"></video>
<video src="./subbed_translate.mp4" controls playsinline preload="metadata"></video>
{% end %}
