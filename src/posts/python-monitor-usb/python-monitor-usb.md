---
title: Detecting USB drive insertion & removal on Windows using Python
description: Monitor new drives on Windows and perform tasks
date: 2020-06-28
tags: 
    - python
    - post
wmic_docs: https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-logicaldisk
---

I was looking for a way to monitor changes in mounted drives to run scripts that updates a catalog.
Most solutions found online use C#, which is fine, but I was looking for a way to do it in Python.

I discovered `wmic`[^wmic] command which gives detailed info about the current system.
Using `wmic logicaldisk`, I was able to query drive letters, caption and their type then parse the output with regex.

<details>
<summary>Click to see the list of disk properties <code>wmic</code> provides</summary>
Explanations for the properties can be found <a href="{{ wmic_docs }}" target='_blank'>here</a>
{% for line in wmic %}
- `{{ line }}`
{% endfor %}
</details>

```python
import re
import subprocess
import threading
from time import sleep
from typing import Callable


def get_drives() -> dict:
    output = subprocess.getoutput('wmic logicaldisk get name,volumename')
    drives = {}
    for line in output.splitlines()[1:]:
        if not line.strip():
            continue
        try:
            letter, label = re.split(r'\s+', line.strip(), 1)
        except:
            letter, label = line, ''
        drives[letter.strip(':')] = label
    return drives


def watch_drives(on_change: Callable[[dict], None] = print, poll_interval: int = 1):
    def _watcher():
        prev = None
        while True:
            drives = get_drives()
            if prev != drives:
                on_change(drives)
                prev = drives
            sleep(poll_interval)

    t = threading.Thread(target=_watcher)
    t.start()
    t.join()


if __name__ == '__main__':
    watch_drives(on_change=print)

```
which polls the list of drives every second, then calls the callback `on_change` with 
a dict of the current set of drives.

Here's the output after I plug a USB drive in and out: 
```text
{'C': 'SYS', 'D': 'RESERVE'}
{'C': 'SYS', 'D': 'RESERVE', 'E': 'ME'}
{'C': 'SYS', 'D': 'RESERVE'}
```

[wmic_docs]: {{ wmic_docs }}
[^wmic]: Windows Management Instrumentation Commandline. [Documentation][wmic_docs] for `logicaldisk` class.
