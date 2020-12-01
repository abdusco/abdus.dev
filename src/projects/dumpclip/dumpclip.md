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

**dumpclip** is a simple utility that prints clipboard contents to the console as JSON. It supports text and files content.


::: download
You can find the latest release and source on Github:

- [Source code](https://github.com/abdusco/dumpclip)
- [Latest release](https://github.com/abdusco/dumpclip/releases)
:::


## Usage
Copy some text into the clipboard and run the program.

```powershell
dumpclip.exe
```

Clipboard contents will be serialized as JSON and written to the console:

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

The program will listen to the clipboard and dump contents to the console when the clipboard content changes. You can stop listening by exiting the program with [[Ctrl]] + [[C]]

```json
{"files":["D:\\_dev\\windows\\ClipboardDemo\\DumpClipboard\\bin\\Release\\dumpclip.exe"]}
{"text":"System.ValueTuple"}
```

### Python script for monitoring clipboard

The main reason I've built this utility was to integrate it into a Python script. 
So here's a simple function that runs the app and captures its stdout and calls the given callback.

```python
import json
import subprocess
import threading
from typing import Callable


def monitor_clipboard(on_change: Callable[[dict], None]) -> None:
    def listen_stdout(proc: subprocess.Popen):
        for line in iter(proc.stdout.readline, ""):
            if line.strip():
                payload = json.loads(line)
                on_change(payload)

    proc = subprocess.Popen(
        ["dumpclip.exe", "--listen"],
        text=True,
        universal_newlines=True,
        stdout=subprocess.PIPE,
    )
    th = threading.Thread(
        target=listen_stdout,
        args=(proc,),
    )
    th.start()
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.kill()
        raise


if __name__ == "__main__":
    monitor_clipboard(on_change=print)
```

I've also written [a short post](/posts/monitor-clipboard/) as to why I made this and how it progressed.