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



[[toc]]

## Common metadata

### Creation and modification date

- Single file:
  ```powershell
  (Get-ChildItem .\file.ext).CreationTime = {{todayStrLong}}
  (Get-ChildItem .\file.ext).LastWriteTime = {{todayStrLong}}
  ```


- All files in current folder:
  ```powershell
  Get-ChildItem | ForEach-Object { $_.CreationTime = {{todayStr}} }
  Get-ChildItem | ForEach-Object { $_.LastWriteTime = {{todayStr}} }
  ```


## Media files

### Loading TagLib#

[TagLib#][taglib.github] is a really great library crafted for this job. Download the [NuGet package][taglib.nuget] and unzip it.
Copy the `TagLibSharp.dll` into where you'll be running the script.

```shell
.
├── lib
│   ├── net45
│   │   ├── ...
│   └── netstandard2.0
│       ├── TagLibSharp.dll <-- we need this one
│       ├── TagLibSharp.pdb
│       └── TaglibSharp.xml
├── ...
└── ...
```

Load the DLL:
```powershell
[System.Reflection.Assembly]::LoadFrom((Resolve-Path "TagLibSharp.dll"))
```


### Image metadata

Open the file and set properties in `.ImageTag` object and save it.

```powershell
$photo = [TagLib.File]::Create((Resolve-Path "photo.jpg"))

$photo.ImageTag.Title = "hello"
$photo.ImageTag.Keywords = ("tag", "another tag")
$photo.ImageTag.Comment = "my comment"
$photo.ImageTag.DateTime = [System.DateTime]::Parse("2020-01-02")

$photo.Save()
```

### Video metadata

[TagLibSharp][taglib.github] can modify video metadata too.

```powershell
$video = $video = [TagLib.File]::Create((Resolve-Path ./video.mkv))

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
$cover = [TagLib.Picture]::CreateFromPath((Resolve-Path cover.png))

$video = [TagLib.File]::Create((Resolve-Path video.mp4))
$video.Tag.Pictures = ($cover)
$video.Save()

$music = [TagLib.File]::Create((Resolve-Path music.mp3))
$music.Tag.Pictures = ($cover)
$music.Save()
```

[taglib.github]: https://github.com/mono/taglib-sharp
[taglib.nuget]: https://www.nuget.org/api/v2/package/TagLibSharp