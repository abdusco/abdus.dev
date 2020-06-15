---
title: Upgrade Python SQLite driver to latest version on Windows
slug: sqlite-upgrade-windows
date: 2020-06-01
tags: 
    - python
    - post
---

# {{ title }}

Download the latest compiled DLL Windows: 

{% for url in dllUrls %}
- [{{url}}]({{ url }})
{%- endfor %}

<cite>(updated daily from [SQLite][sqlite]</cite>

Extract the ZIP file and place DLL files into `$PYTHON_DIR/DLLs`. 

You can find the exact location using PowerShell:

```powershell
(join-path (split-path (get-command python).Path) "dlls")
# C:\Python38\dlls

# open the folder
start (join-path (split-path (get-command python).Path) "dlls")  
```
or use cmd directly:

```commandline
powershell -command "start (join-path (split-path (get-command python).Path) "dlls")"
```

## SQLite compile options

Using Python, check the list of compile options:

```python
import sqlite3
options = sqlite3.connect(':memory:').execute('pragma compile_options').fetchall()
for o in options: print(o[0])
```

```
COMPILER=msvc-1500
ENABLE_BYTECODE_VTAB
ENABLE_COLUMN_METADATA
ENABLE_DBSTAT_VTAB
ENABLE_FTS3
ENABLE_FTS4
ENABLE_FTS5
ENABLE_GEOPOLY
ENABLE_JSON1
ENABLE_RTREE
ENABLE_STMTVTAB
MAX_TRIGGER_DEPTH=100
TEMP_STORE=1
THREADSAFE=1
```

[sqlite]: {{ sqliteDownloadUrl }}