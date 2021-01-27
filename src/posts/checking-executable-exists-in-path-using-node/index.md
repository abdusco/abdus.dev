---
title: Checking if an executable exists in PATH using Node.js
tags:
  - node
  - post
date: 2021-01-26
---

# {{ title }}

I was writing a mini npm package to distribute a Powershell script. It is designed for users [run the Powershell script](/posts/running-powershell-script-in-node/) using `npx package-name ...args` which gives passes arguments to the script and it takes from there. 

## Problem

The problem arised when I wanted to check if a modern version of Powershell exists on the user's machine.
The first solution that came to my mind was checking executable version[^version].

```powershell
pwsh -command "echo $PSVersionTable.PSVersion.ToString()" 
```

but it runs really slowly.

## Solution

A faster solution is to check if `pwsh.exe` exists in `PATH`. There's a pre-made solution for this, as with anything, called [hasbin](https://github.com/springernature/hasbin) but it's quite old and uses external dependencies for async operations that are native to modern JS.

```js
/**
 * @param {string} exe executable name
 * @return {Promise<string|null>} executable path if found
 * */
async function binExists(exe) {
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

Then we can use it to get the most recent Powershell installation.

```js
async function getPowershellVariant() {
    if (await binExists("pwsh")) {
        return "pwsh";
    }
    if (await binExists("powershell")) {
        return "powershell";
    }

    throw new Error("Powershell is not installed, or not in PATH");
}
```


[^version]: This usually involves running a binary with `--version` option, but Powershell behaves completely differently and uses `-version` option to specify the version of Powershell to run the command/script against.