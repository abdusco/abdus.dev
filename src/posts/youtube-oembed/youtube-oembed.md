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




Youtube supports [oEmbed][oembed] format. This means we can easily fetch information about a video, such
as its thumbnail image, HTML for embedding, title etc. without having to use Youtube API or scraping
the Youtube page. You can reach oEmbed API at:

[oembed]: https://oembed.com/


```url
https://www.youtube.com/oembed?url=YOUTUBE_URL
```

It returns a JSON filled with metadata. You can explore the oEmbed response yourself using the demo below.

## Demo

Paste in a url and click fetch to inspect an oembed json for a Youtube video.

<form id="yt" @submit.prevent="handleSubmit()" x-data="app()" x-cloak>
<p>
    <label for="url">URL:</label>
    <input id="url" type="url" x-model="url" name="url" placeholder="https://url/to/youtube/video">
</p>
<p>
    <span>oEmbed URL:</span>
    <pre class='snippet' data-lang="url" x-text="url ? oembedUrl(url) : '...'"></pre>
</p>
<p>
    <button type="submit" class="button">fetch!</button>
</p>
<pre class="snippet" data-lang="json"><code x-text="text"></code></pre>
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
                const url = `https://proxy.abdusco.workers.dev?url=${this.oembedUrl(this.url)}`;
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
