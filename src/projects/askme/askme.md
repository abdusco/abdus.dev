---
title: askme - a mini utility for prompting questions
description: A simple app to prompt question and dump answers to console as JSON
date: 2020-11-27
tags:
    - app
    - utility
    - project
---

# {{ title }}

**askme** is a mini utility that prompts user questions and prints answers in key-value format to console.
Questions are provided as command arguments as `"question"` or as `"question=default answer"` format. You can also specify a key with `key:` prefix.

## Usage

```powershell
askme.exe "filename:Filename for the export=export.zip" "author:Author?" year
```

A dialog should appear with inputs to type the answers:

<video src="./askme.webm" autoplay loop controls playsinline></video>

When saved with clicking the Save button or hitting `[ENTER]` key, app exits and the user inputs are printed to console as JSON.

```json
{"filename":"report.zip","author":"abdus","year":"2020"}
```

The response can then be consumed from any script by reading the stdout and deserializing the JSON.

Hitting `[Esc]` key closes the window and nothing is printed to console.

## Return codes

| Code | Reason |
|-----:|:-------|
|`0`| User submitted the answers|
|`1`| Failed to parse questions|
|`2`| User cancelled the prompt|


## Download

[Binary files][releases] and [the source code][source] are available on Github.

[releases]: https://github.com/abdusco/askme/releases
[source]: https://github.com/abdusco/askme