---
title: Guide to editing file metadata using PowerShell
slug: powershell-file-metadata-guide
date: 2020-05-25
tags:
    - powershell
    - post
---
{% set todayStr = today.format('YYYY-MM-DD') | json | safe %}
{% set todayStrLong = today.format('YYYY-MM-DD HH:mm') | json | safe %}

# {{ title }}

[[toc]]

## Common metadata

### Creation and modification date

- Single file:
  ```powershell
  (Get-ChildItem .\file.ext).CreationTime = {{todayStrLong}}
  (Get-ChildItem .\file.ext).LastWriteTime = {{todayStrLong}}
  ```

  ::: tip
  You can use `gci` or `ls` as an alias for `Get-ChildItem` [^0]
  :::


- All files in current folder:
  ```powershell
  ls | % { $_.CreationTime = {{todayStr}} }
  ls | % { $_.LastWriteTime = {{todayStr}} }
  ```
  
  ::: tip
  `%` is an alias for `ForEach-Object` [^0]
  :::


## Media files

### Loading TagLib#

[TagLib#][taglib.github] is a really great library crafted for this job. Download the [NuGet package][taglib.nuget] and unzip it.
Copy the `TagLibSharp.dll` into where you'll be running the script.

```shell
.
├── lib
│   ├── net45
│   │   ├── ...
│   └── netstandard2.0
│       ├── TagLibSharp.dll <-- we need this one
│       ├── TagLibSharp.pdb
│       └── TaglibSharp.xml
├── ...
└── ...
```   

Load the DLL:
```powershell
[System.Reflection.Assembly]::LoadFrom((rvpa "TagLibSharp.dll"))
```

::: tip
`rvpa` is an alias for `Resolve-Path` [^0]
:::


### Image metadata

Open the file and set properties in `.ImageTag` object and save it.

```powershell
$photo = [TagLib.File]::Create((rvpa "photo.jpg"))

$photo.ImageTag.Title = "hello"
$photo.ImageTag.Keywords = ("tag", "another tag")
$photo.ImageTag.Comment = "my comment"
$photo.ImageTag.DateTime = [System.DateTime]::Parse("2020-01-02")

$photo.Save()
```

### Video metadata

[TagLibSharp][taglib.github] can modify video metadata too.

```powershell
$video = $video = [TagLib.File]::Create((rvpa ./video.mkv))

$video.Tag.Title = "my video"
$video.Tag.Year = 2020
$video.Tag.Comment = "a comment"
$video.Tag.Publisher = "a publisher"
$video.Tag.Description = "a description"

$video.Save()
```

### Cover photo

Load the image file and override `.Tag.Pictures` with an array.

```powershell
$cover = [TagLib.Picture]::CreateFromPath((rvpa cover.png))

$video = [TagLib.File]::Create((rvpa video.mp4))
$video.Tag.Pictures = ($cover)
$video.Save()

$music = [TagLib.File]::Create((rvpa music.mp3))
$music.Tag.Pictures = ($cover)
$music.Save()
```

[taglib.github]: https://github.com/mono/taglib-sharp
[taglib.nuget]: https://www.nuget.org/api/v2/package/TagLibSharp
[aliases]: /posts/powershell-aliases
[^0]: A list of aliases can be found [here][aliases].