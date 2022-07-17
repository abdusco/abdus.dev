---
title: Sniffing io.Reader contents in Golang
slug: sniffing-io-reader-in-golang
description: Read a small chunk from the beginning of an io.Reader into memory and reuse it
tags:
  - golang
  - ffmpeg
  - post
date: 2022-07-17
---

## The problem: reading a stream multiple times

I wanted to use `ffmpeg` to generate contact sheet for a video. This is the command I use to generate a thumbnail tile.

```shell
cat /path/to/video.mp4 | ffmpeg \
    -v error \
    -skip_frame nokey \  # use keyframes only (makes it fast)
    -ss 10 \  # skip the first 10 seconds
    -i - \
    -vf 'fps=1/60,scale=480:-1,tile=3x22' \  # 480px wide tiles in 3 columns every 60 seconds
    -frames 1 \
    -f image2pipe - \
    > thumbs.jpg
```

The tricky part is to calculate `tile=3x22` part. It's the grid (and the number of tiles) that determines how far into the video we're reading. If it's too few, the contact sheet doesn't cover the whole video. If it's too many, the we get blank tiles at the end.

There's a way out: if we know the duration of the video, we can calculate how many tiles there should be, so that we can cover the whole video.

For that, I use `ffprobe`:

```shell
cat /path/to/video.mp4 | ffprobe \
    -v quiet \
    -i - \
    -print_format json \
    -show_entries format=duration
```

which returns the duration, and we can use that to calculate the size of the tile grid, given an interval.

```json
{
    "format": {
        "duration": "4059.051000"
    }
}
```

I wanted to pipe the video stream to both `ffprobe` and `ffmpeg`, and reuse it without the caller knowing.

```golang
func generateThumbs(ctx context.Context, r io.Reader, w io.Writer) error {
    // ...

    cmd := exec.CommandContext(
        ctx,
        "ffprobe",
        // ...
    )
    cmd.Stdin = r

    // parse duration

    // use the duration to calculate ffmpeg args

    cmd := exec.CommandContext(
        ctx,
        "ffmpeg",
        // ...
    )
    cmd.Stdin = r  // reuse the video stream?
    cmd.Stdout = w

    // ...
}
```

Now we face a problem: whatever `ffprobe` reads from the video stream `r` is gone and `ffmpeg` cannot use it.

We need to find a way to sniff the video properties and put what we consume back where we found it.

## Solution: `io.TeeReader` and `io.MultiReader`

Luckily, `ffprobe` doesn't need to read the whole file to determine the video properties. It only reads a few MBs from the beginning. It doesn't hurt to keep a couple of MBs of video in memory.

We can use `io.TeeReader` to keep those bits in a buffer. Then use a `io.MultiReader` to reconstruct the original stream by combining the buffer with the remainder of the input stream.
Then we pipe this to `ffmpeg`.

```golang
var buf bytes.Buffer  // keep the bits ffprobe needs in a buffer
tr := io.TeeReader(r, &buf)

cmd := exec.CommandContext(
    ctx,
    "ffprobe",
    // ...
)
cmd.Stdin = r

// ...

r = io.MultiReader(&buf, r)  // then combine it back (in the right order)

cmd := exec.CommandContext(
    ctx,
    "ffmpeg",
    // ...
)
cmd.Stdin = r  // re-constructed input
```

Now the contraption works great. `ffprobe` reads a couple megs, finds the duration, then ffmpeg reads the whole file again and generates the thumbs.