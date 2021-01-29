---
title: Running a Powershell script in Node
tags:
  - node
  - powershell
  - post
date: 2021-01-21
---



I needed a way to call a Powershell script from Node. Node provides `child_process` module, which helps us execute and
communicate with external processes.

We're going to use `spawn` for this. I know `utils/promisify` exists, but I like providing my own wrapper to
promisify `spawn`. It helps me return the exit code to the caller and I also get a better intellisense while writing scripts.

```js
const {spawn} = require("child_process");

/**
 * @param {string} executable
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} opts
 * @return {Promise<number>} return code
 * */
async function run(executable, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(executable, args, {
            shell: true,
            stdio: ["pipe", process.stdout, process.stderr],
            ...opts,
        });
        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(code);
            }
        });
    });
}
```

We can then call `run` inside a try-catch block to capture errors and set a correct exit code.

```js
try {
    const code = await run('powershell', ["-executionpolicy", "unrestricted", "-file", 'script.ps1']);
    process.exit(code);
} catch (e) {
    console.error(e);
    process.exit(1);
}
```