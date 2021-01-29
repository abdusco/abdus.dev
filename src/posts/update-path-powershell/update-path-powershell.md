---
title: Updating PATH environment variable using PowerShell
description: A quick way to add a new directory to PATH environment variable
tags:
  - post
  - powershell
date: 2020-10-27
$aliases:
    - posts/updating-path-environment-variable-using-powershell/
---


I am writing a script to configure a fresh Windows installation to fit my workflow. 
This usually involves installing [chocolatey][choco] as my package manager 
and installing programs I need. Along with it, I also need to restore settings for certain apps 
and update the [`PATH`][path] environment variable. 

Until today I've always added paths manually, but it turns out, there's an easier way. 
[Thanks to some googling][microsoft_docs], 
I was able to create this script that adds the given dir 
to `PATH` environment variable for the current user.

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
        # backup the current value
        "PATH=$path" | Set-Content -Path "$env:USERPROFILE/path.env"
        # append dir to path
        [Environment]::SetEnvironmentVariable("PATH", $path + ";$dir", [EnvironmentVariableTarget]::User)
        Write-Host "Added $dir to PATH"
        return
    }
    Write-Error "$dir is already in PATH"
}
```

It expects a path to a directory as the argument:

```powershell
Add-ToUserPath "$env:USERPROFILE/.bin"
```

If you want to set the environment variable for all users, change the target `[System.EnvironmentVariableTarget]` parameter from `User` to `Machine`.

## Adding the script to PowerShell profile

Pasting and running this code, or importing a file every time we need to update `PATH` defeats the purpose. 
We need a way to access it quickly. That's where the PowerShell [profile][profile] comes into play. 
It's a file (similar to `.bashrc` in bash) that runs everytime a PowerShell session starts[^args]

Open the profile with an editor.
```powershell
notepad $PROFILE
```

Paste the function into this file and save it. 
When you open a new powershell window, you should be able to use the function.


[choco]: https://chocolatey.org/install
[profile]: https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles
[path]: https://en.wikipedia.org/wiki/PATH_(variable)
[microsoft_docs]: https://docs.microsoft.com/en-us/dotnet/api/system.environment.setenvironmentvariable

[^args]: Unless `-NoProfile` argument is given
