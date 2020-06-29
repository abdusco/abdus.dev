---
title: Adding metadata to videos using ffmpeg
description: Update video metadata with ffmpeg and Python
tags:
  - ffmpeg
  - python
  - post
date: 2020-06-29T00:00:00.000Z
---
# {{title}}

I've been maintaining a movie archive for years now. Every year or so I go over what I have and do a clean-up if necessary.

This time I've decided to add metadata about title, year, IMDb links, artists etc. to videos. I've written about [a way to do it on PowerShell][metadata], but nothing comes closer to joy I get from writing in Python.

## ffmpeg command
ffmpeg supports practically anything under the sun, including adding metadata. [This answer][https://stackoverflow.com/a/11479066/5298150] on StackOverflow put me in the right path. With ffmpeg, adding metadata is simply including `-metadata key=value` arguments in the command:

```cmd
ffmpeg -i video.mkv -c:a copy -c:v copy -c:s copy -movflags use_metadata_tags -map_metadata 0 -metadata title="Hello World" -metadata year=2020 video.metadata.mkv
```

Some important points:
- Use `-c:a copy`, `-c:v copy` and `-c:s copy` to copy audio, video and subtitle streams directly without encoding.
- Use `-map_metadata 0` to copy over existing meta tags without changing them[^0].

Not all containers support every metadata. For reference you can check [Matroska spec][matroska] for MKV and [Kodi docs][kodi] for MP4.

## Python script

```python
import subprocess
from pathlib import Path


def add_metadata(video: Path,
                 save_path: Path = None,
                 overwrite: bool = True,
                 **meta):
    if not save_path:
        save_path = video.with_suffix('.metadata' + video.suffix)

    metadata_args = []
    for k, v in meta.items():
        metadata_args.extend([
            '-metadata', f'{k}={v}'
        ])

    args = [
        'ffmpeg',
        '-v', 'quiet',
        '-i', str(video.absolute()),
        *metadata_args,
        '-map_metadata', '0',
        '-movflags', 'use_metadata_tags',
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-c:s', 'copy',
        str(save_path)
    ]
    if overwrite:
        args.append('-y')
    proc = subprocess.run(args, stdout=subprocess.PIPE)
    proc.check_returncode()


if __name__ == '__main__':
    vid = Path(r'video.mkv')
    add_metadata(
        vid,
        title=vid.stem,
        comment=vid.stem,
        year=2020,
    )

```

`add_metadata` function takes arbitrary key:value parameters and turns them into ffmpeg arguments.




[metadata]: /posts/powershell-file-metadata-guide/#video-metadata
[matroska]: https://www.matroska.org/technical/tagging.html
[kodi]: https://kodi.wiki/view/Video_file_tagging#Supported_Tags
[answer]: https://video.stackexchange.com/questions/23741/how-to-prevent-ffmpeg-from-dropping-metadata

[^0]: From [this][answer] StackOverflow answer