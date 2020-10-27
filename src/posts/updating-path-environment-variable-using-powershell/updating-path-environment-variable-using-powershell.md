---
title: Updating PATH environment variable using PowerShell
description: A quick way to add a new directory to PATH environment variable
tags:
  - post
  - powershell
date: 2020-10-27
---
# {{ title }}

I am writing a script to set up a PC to fit my workflow. This usually involves installing [chocolatey][choco] as my package manager and installing programs I need. But it doesn't end there, I need to restore settings for certains apps and also update [`PATH`][path] environment variable. 

Until today I've always added paths manually, but no more. Thanks to some googling, I created this script that adds given dir to `PATH` environment variable for the current user.

```powershell
function Add-ToUserPath {
    param (
        [Parameter(Mandatory=$true)]
        [ValidateNotNullOrEmpty()]
        [string] 
        $dir
    )

    $dir = (Resolve-Path $dir)

    $path = [Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User)
    if (!($path.Contains($dir))) {
        $path | Set-Content -Path 'path.env'
        [Environment]::SetEnvironmentVariable("PATH", $path + ";$dir", [EnvironmentVariableTarget]::User)
    }
}
```

then use it like so:

```powershell
Add-ToUserPath "$env:USERPROFILE/.bin"
```

## Adding the script to PowerShell profile

Pasting this code, or importing a file every time I need to update `PATH` defeats the purpose. I need a way to access it quickly. That's where [profiles][profile] come into play. It's a file (similar to `.bashrc` for bash) that runs everytime a PowerShell session starts[^args]

Open profile file
```powershell
code $PROFILE
```

Paste the function into this file and save it. When you open a new powershell window, you should be able to use the function.


[choco]: https://chocolatey.org/install
[profile]: https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles
[path]: https://en.wikipedia.org/wiki/PATH_(variable)

[^args]: Unless `-NoProfile` argument is given
