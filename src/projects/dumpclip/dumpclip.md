---
title: dumpclip - a utility for dumping clipboard contents
description: A simple app that dumps clipboard contents
date: 2020-11-28
tags:
    - app
    - utility
    - project
---

# {{ title }}

![](./dumpclip.png)

**dumpclip** is a simple utility that prints clipboard contents to console as JSON. It supports text and files.

## Usage
Copy some text into clipboard and run the program.

```powershell
dumpclip.exe
```

Clipboard contents will be serialized as JSON and written to console:

```json
{"text":"monitor"}
```

Copy some files and try again.

```json
{"files":["D:\\_dev\\web\\abdus.dev\\src\\projects\\askme\\askme.gif","D:\\_dev\\web\\abdus.dev\\src\\projects\\askme\\askme.md"]}
```

## Listen to clipboard changes

Run the program with `--listen` flag.

```powershell
dumpclip.exe --listen
```

The program will listen to clipboard and dump contents to console when the clipboard content changes. You can stop listening by exiting the program with `[Ctrl]` + `[C]`

```json
{"files":["D:\\_dev\\windows\\ClipboardDemo\\DumpClipboard\\bin\\Release\\dumpclip.exe"]}
{"text":"System.ValueTuple"}
```

## Download

The [latest version][releases] of the app and the [source code][repo] can be downloaded from Github

[releases]: https://github.com/abdusco/dumpclip/releases/latest
[repo]: https://github.com/abdusco/dumpclip
