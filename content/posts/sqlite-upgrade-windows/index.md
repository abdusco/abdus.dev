---
title: Upgrade Python SQLite driver to latest version on Windows
description: Use JSON1 and FTS5 extensions on Windows
date: 2020-02-20
taxonomies:
  tags: [sqlite, python]
---

SQLite has an extension called [`JSON1`][json1] that allows working with JSON. 
It's really useful for storing data that wouldn't necessarily belong to a separate column, like metadata. 

Unfortunately on Windows, SQLite driver for Python doesn't come bundled with this extension. 
We need to upgrade the driver to a newer version to get it.

You can find the compiled binaries for Windows on [SQLite website][sqlite]. 
Here are the links, scraped directly from the page:  

{% download() %}
<ul id="sqlite-downloads">
  <li>Fetching the latest download URLs...</li>
</ul>
<script>
    (async () => {
        const list = document.getElementById('sqlite-downloads');
        try {
            const url = 'https://www.sqlite.org/download.html#win32';
            const response = await fetch(`https://cors.abdus.dev?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('Failed to fetch SQLite downloads');
            const html = await response.text();
            const paths = [...new Set((html.match(/\d+\/[^\s"'<>]+\.zip/g) || [])
                .filter(path => /dll-win/.test(path)))];
            if (!paths.length) throw new Error('No SQLite DLL downloads found');
            list.replaceChildren(...paths.map(path => {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.href = `https://www.sqlite.org/${path}`;
                link.textContent = link.href;
                item.append(link);
                return item;
            }));
        } catch (error) {
            list.firstElementChild.textContent = 'Unable to fetch downloads. Please use the SQLite website link above.';
        }
    })();
</script>
{% end %}


Extract the ZIP file and place the DLL into `$PYTHON_DIR/DLLs`. 

You can find the exact location using PowerShell:

```powershell
start (Join-Path (Split-Path (Get-Command python).Path) "dlls")
# C:\Python39\dlls
```
or use cmd directly:

```cmd
powershell -command "start (Join-Path (Split-Path (Get-Command python).Path) "dlls")"
```

## SQLite compile options

Run `python`, and fetch the list of compilation options to verify if it has succeeded:

```python
import sqlite3
options = sqlite3.connect(':memory:').execute('pragma compile_options').fetchall()
for o in options: print(o[0])
```

```console
COMPILER=msvc-1500
ENABLE_BYTECODE_VTAB
ENABLE_COLUMN_METADATA
ENABLE_DBSTAT_VTAB
ENABLE_FTS3
ENABLE_FTS4
ENABLE_FTS5
ENABLE_GEOPOLY
ENABLE_JSON1 <-- IT WORKS! 🎉
ENABLE_RTREE
ENABLE_STMTVTAB
MAX_TRIGGER_DEPTH=100
TEMP_STORE=1
THREADSAFE=1
```

Thanks to the new driver, we also have access to [`FTS5`][fts5] extension to work with full text search indices.

[sqlite]: https://www.sqlite.org/download.html#win32
[json1]: https://www.sqlite.org/json1.html
[fts5]: https://www.sqlite.org/fts5.html
