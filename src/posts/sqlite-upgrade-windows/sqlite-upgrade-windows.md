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

SQLite has an extension called [`JSON1`][json1] to work on JSON columns. It's really useful for storing data that wouldn't necessarily belong to a separate column, like metadata. But SQLite driver doesn't include this extension by default on Windows. So we'll have to manually upgrade it.

Download the latest compiled [DLL for Windows][sqlite]: 

::: download
<ul x-data="app()" x-init="init()">
  <template x-if="!links.length">
    <li>Fetching the latest download URLs...</li>
  </template>
  <template x-for="url in links" x-bind:key="url">
    <li><a x-bind:href="url" x-text="url"></a></li>
  </template>
</ul>
<script src="https://cdn.jsdelivr.net/gh/alpinejs/alpine@2/dist/alpine.js" defer></script>
<script>
    const app = () => ({
        links: [],
        async init() {
            const url = `https://www.sqlite.org/download.html#win32`;
            const html = await fetch(`/api/proxy?url=${decodeURIComponent(url)}`).then(r => r.text());
            this.links = html.match(/(\d+\/[^.]+.zip)/gm)
                .filter(path => /dll-win/.test(path))
                .map(path => `https://www.sqlite.org/${path}`);
        }
    });
</script>
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

Thanks to new driver, we now have access to [`FTS5`][fts5] for working with full text search, in addition to [`JSON1`][json1] extension.

[sqlite]: https://www.sqlite.org/download.html#win32
[json1]: https://www.sqlite.org/json1.html
[fts5]: https://www.sqlite.org/fts5.html