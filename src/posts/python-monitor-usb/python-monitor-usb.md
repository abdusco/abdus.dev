---
title: Detecting USB drive insertion & removal on Windows using Python
date: 2020-06-28
tags: 
    - python
    - post
wmic_docs: https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-logicaldisk
---
# {{ title }}

I was looking for a way to monitor changes in mounted drives in order to run scripts that updates a catalogue.
Most solutions found online uses C#, which is fine, but I was looking for a way to do it in Python.

I've found about `wmic`[^wmic] command which gives detailed info about the current system.
Using `wmic logicaldisk`, I've queried drive letter, caption and type then parsed the output with regex.

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
    output = subprocess.getoutput('wmic logicaldisk get drivetype,name,volumename')
    drives = {}
    for line in output.splitlines()[1:]:
        if not line.strip():
            continue
        try:
            disk_type, letter, label = re.split(r'\s+', line.strip(), 2)
        except:
            [disk_type, letter], label = re.split(r'\s+', line.strip(), 1), ''
        disk_type = int(disk_type)
        drives[letter.strip(':')] = {
            'label': label,
            'removable': disk_type == 2
        }
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
a dict of current set of drives.

Here's the output after I plug a USB drive in and out: 
```text
{'C': {'label': 'SYS', 'removable': False}, 'D': {'label': 'RESERVE', 'removable': False}}
{'C': {'label': 'SYS', 'removable': False}, 'D': {'label': 'RESERVE', 'removable': False}, 'E': {'label': 'ME', 'removable': True}}
```

[wmic.docs]: {{ wmic_docs }}
[^wmic]: Windows Management Instrumentation Commandline. [Documentation][wmic.docs] for `logicaldisk` class.
