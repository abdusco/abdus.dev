---
title: Monitoring clipboard with Python
date: 2020-11-30
tags:
    - python
    - c#
    - windows
    - post
---

# {{title}}

I needed a way to listen to clipboard and get its contents as it changed. 
I've found a couple of ways to achieve this in Python. But most solutions poll for changes, others use `ctypes` and Win32 APIs. Working with C bindings in Python is not a fun time, and debugger doesn't really help with pointers and native types. So I decided to build a utility in C# that does it for me.
As a plus, it has a much nicer API to work with, not to mention first class support for Win32 APIs, with better debugging abilities.
I've released this utility, called [**dumpclip**][dumpclip], on [Github][dumpclip_repo]. 


## First attempt: polling for changes

The first iteration of the script involved dumping the clipboard contents as JSON then exiting. But that meant polling for changes every second. 

```powershell
> dumpclip.v1.exe
{"text":"monitor"}
```

integrating this into a Python script:

```python
import json
import subprocess
import threading
from time import sleep
from typing import Callable


def get_clipboard() -> dict:
    proc = subprocess.run(
        ["dumpclip.v1.exe"],
        stdout=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        return {}
    return json.loads(proc.stdout)


def monitor_clipboard(on_change: Callable[[dict], None]) -> None:
    def monitor():
        old = None
        while True:
            new = get_clipboard()
            if old != new:
                on_change(new)
                old = new
            sleep(1)

    th = threading.Thread(target=monitor)
    th.start()

    th.join()


if __name__ == "__main__":
    monitor_clipboard(on_change=print)

```

This worked fine, but I didn't want to keep launching a process every second.


## Second iteration: registering a clipboard listener

Second iteration involved using Win32 APIs. I've used [`SetClipboardViewer`][setclipboardviewer] to register a callback for clipboard changes in C#, then retrieved & dumped clipboard contents as the new content came in.

```powershell
> dumpclip.v2.exe --listen
{"text":"ClipboardChanged"}
{"text":"monitor"}
{"files":["D:\\path\\to\\file.ext"]}
...
```

This worked much better. Because now I can capture this process's output, and trigger a callback directly, instead of polling for changes. But **dumpclip** launched in listener mode never terminates. We need to read its stdout in real time.

## Capturing stdout of a long-running process in real time

To capturing the output of a process, we need to launch it with `subprocess.Popen` and pipe its output to `subprocess.PIPE`.
Also, we need to capture its stdout in a separate thread. Because the thread that launches the process will be waiting for it to terminate (despite the fact that it never will).

Because the process doesn't terminate, the thread that consumes its stdout doesn't stop, either. 
It consumes the process's output as new content comes in, and waits if there's nothing to consume, because `proc.stdout.readline()` is blocking.
When the process is killed, proc.stdout doesn't block anymore and the thread terminates.


```python
import json
import subprocess
import threading
from typing import Callable


def monitor_clipboard(on_change: Callable[[dict], None]) -> None:
    def read_stdout(proc: subprocess.Popen):
        for line in iter(proc.stdout.readline, ""):
            if line.strip():
                payload = json.loads(line)
                on_change(payload)

    proc = subprocess.Popen(
        ["dumpclip.v2.exe", "--listen"],
        text=True,
        stdout=subprocess.PIPE,
    )
    th = threading.Thread(
        target=read_stdout,
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

To prevent blocking interrupt signal and let the subprocess exit, we need to `.wait()` it. This allows `KeyboardInterrupt` to bubble when I hit `[Ctrl] + [C]` and terminates the script and subprocesses.


[dumpclip]: https://abdus.dev/projects/dumpclip/
[dumpclip_repo]: https://github.com/abdusco/dumpclip
[setclipboardviewer]: https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setclipboardviewer