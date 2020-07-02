---
title: Upgrade Python SQLite driver to latest version on Windows
slug: sqlite-upgrade-windows
description: Use JSON1 and FTS5 extensions on Windows
tags:
  - sqlite
  - python
  - post
date: 2020-02-20
---

# {{ title }}

SQLite has an extension called `JSON1` to work on JSON columns. It's really useful for storing metadata about a record that wouldn't necessarily belong to a separate column, like metadata. But SQLite driver doesn't include this extension by default on Windows. So we'll have to manually upgrade it.

Download the latest compiled DLL for Windows: 

::: download
{% for url in downloadUrls %}
- [{{url}}]({{ url }})
{%- endfor %}

<small>Links are updated daily from [SQLite][sqlite]</small>
:::



Extract the ZIP file and place DLL files into `$PYTHON_DIR/DLLs`. 

You can find the exact location using PowerShell:

```powershell
(join-path (split-path (get-command python).Path) "dlls")
# C:\Python38\dlls

# open the folder
start (join-path (split-path (get-command python).Path) "dlls")  
```
or use cmd directly:

```cmd
powershell -command "start (join-path (split-path (get-command python).Path) "dlls")"
```

## SQLite compile options

Using `python`, check the list of compile options to verify if it worked:

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

Thanks to new driver, we now have access to `FTS5` for working with full text search, in addition to `JSON1` extension.

[sqlite]: {{ sqliteDownloadUrl }}