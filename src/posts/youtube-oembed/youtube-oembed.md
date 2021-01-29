---
title: Youtube oEmbed support
description: Get youtube video info and embed data as JSON.
date: 2019-12-31
tags:
    - til
    - post
$aliases:
    - til/youtube-oembed-support/
---




Youtube supports [oEmbed][oembed] format. This means you can easily get quick info about a video, such
as thumbnail image, embed HTML, video title etc. without using Youtube's API or having to scrape
the Youtube page.

You can reach oEmbed API at `https://www.youtube.com/oembed?url=YOUTUBE_URL`

[oembed]: https://oembed.com/

## Demo

Paste in a url and click fetch to inspect an oembed json for a Youtube video.

<form id="yt" @submit.prevent="handleSubmit()" x-data="app()" x-cloak>
<p>
    <label for="url">URL:</label>
    <input id="url" type="url" x-model="url" name="url" placeholder="<youtube_url>">
</p>
<p>
    <span>oEmbed URL:</span>
    <pre class='snippet' x-text="url ? oembedUrl(url) : '...'"></pre>
</p>
<p>
    <button type="submit" class="button">fetch!</button>
</p>
<pre class="snippet"><code x-text="text"></code></pre>
</form>

<script src="https://cdn.jsdelivr.net/gh/alpinejs/alpine@2/dist/alpine.js" defer></script>
<script>
    function app() {
        return {
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            text: '// json will appear here',
            async handleSubmit() {
                if (!this.url) return;
                this.text = 'fetching json...';
                // https://www.youtube.com/oembed doesn't send CORS headers, so I have to use a proxy here
                const url = `/api/proxy?url=${this.oembedUrl(this.url)}`;
                const json = await fetch(url).then(r => r.json());
                this.text = JSON.stringify(json, null, 2);
            },
            oembedUrl(url) {
                return `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}`
            }
        };
    }
</script>

<style>
    [x-cloak] {
        display: none;
    }
</style>
