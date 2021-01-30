---
title: Checking if an executable exists in PATH using Node.js
tags:
  - node
  - post
date: 2021-01-26
---


I was looking for a way to distribute a Powershell script. 
I decided to wrap it inside an npm package and let users [run the Powershell script](/posts/running-powershell-script-in-node/) using:

```powershell
npx package-name [...args]
``` 

which passes arguments to Powershell and let it run the actual script, which is bundled with the npm package. 

## Problem

The problem arised when I wanted to check if a modern version of Powershell exists on the user's machine.
The first solution that came to my mind was checking executable version[^version].

```powershell
pwsh -command "echo $PSVersionTable.PSVersion.ToString()" 
```

but it runs slowly. It also doesn't handle commands without `--version` or any command switch at all. So trying to run the program to see if actually exists is not a great way to go about it.

## Solution

A faster solution is to check if `pwsh.exe` exists in `PATH`. There's a pre-made solution for this, as with anything, called [hasbin](https://github.com/springernature/hasbin) but it's quite old and uses external dependencies for async operations that are native to modern JS.

`findExecutable` function builds a list of candidates paths from the combinations of all directories in `PATH` and all extensions (no-op if not on Windows) and checks if any of them exists and returns the first result.

If I were to look for `pwsh.exe` and `PATH` were `a/b;c/d`, it would try `a/b/pwsh.exe`, `c/d/pwsh.exe` and so on.


```js
const path = require("path");
const fs = require("fs/promises");

/**
 * @param {string} exe executable name (without extension if on Windows)
 * @return {Promise<string|null>} executable path if found
 * */
async function findExecutable(exe) {
    const envPath = process.env.PATH || "";
    const envExt = process.env.PATHEXT || "";
    const pathDirs = envPath
        .replace(/["]+/g, "")
        .split(path.delimiter)
        .filter(Boolean);
    const extensions = envExt.split(";");
    const candidates = pathDirs.flatMap((d) =>
        extensions.map((ext) => path.join(d, exe + ext))
    );
    try {
        return await Promise.any(candidates.map(checkFileExists));
    } catch (e) {
        return null;
    }

    async function checkFileExists(filePath) {
        if ((await fs.stat(filePath)).isFile()) {
            return filePath;
        }
        throw new Error("Not a file");
    }
}
```

We can finally use `findExecutable` to get the most recent Powershell installation.

```js
async function getPowershellVariant() {
    if (await findExecutable("pwsh")) {
        return "pwsh";
    }
    if (await findExecutable("powershell")) {
        return "powershell";
    }

    throw new Error("Powershell is not installed, or not in PATH");
}
```

## What is `PATHEXT` for?
Windows uses `PATHEXT` environment variable to determine the file name for an executable if you don't specify an extension. On my PC, `PATHEXT` content is:

```powershell
PS> $env:PATHEXT
.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.PY;.PYW;.ps1;.CPL
```

That means, if I just type `pwsh`, it looks for `pwsh.com`, `pwsh.exe`, `pwsh.bat` and so on, and executes the first one it finds. 
That also means if an extension is not on the list, I have to type in the extension. 

This is not an issue on UNIX systems, because they use an [executable bit `+x`][bit] to specify if a file can be executed, regardless of whether it has an extension or not.

[bit]: https://en.wikipedia.org/wiki/File-system_permissions#Symbolic_notation

[^version]: This usually involves running a binary with `--version` option, but Powershell behaves completely differently and uses `-version` option to specify the version of Powershell to run the command/script against.
