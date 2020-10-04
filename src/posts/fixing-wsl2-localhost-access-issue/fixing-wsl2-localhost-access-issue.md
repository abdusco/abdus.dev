---
title: Fixing WSL2 localhost access issue
description: A fix for not being able to access WSL apps from localhost
tags:
  - post
  - windows10
  - wsl2
  - powershell
date: 2020-08-02
images:
  - url: wsl-event.png
    alt: Events logged after starting WSL
---
# {{title}}

I've been using [WSL][wsl] ever since it came out. It was nice being able to run Linux on Windows without the overhead of VMs. But it had some issues, like not being able to run Docker natively. Microsoft then released a new version called WSL2 which has brought native Docker support. 

One feature of WSL is that it allows sharing IP address space for services listening to [localhost][localhost]. This means one can access servers running on WSL on Windows by its address e.g. `localhost:8000`

## Problem 
Localhost redirection [often fails][issues] for some reason, such as when PC sleeps and wakes up, and localhost access to Linux services does not work anymore.

## Solution

To fix this I've created a PowerShell script that gets the IP address of WSL instance, then creates or updates an entry in [hosts file][hosts]. This lets us access WSL by a hostname like `wsl` instead of `localhost`.

```powershell
$hostname = "wsl"

# find ip of eth0
$ifconfig = (wsl -- ip -4 addr show eth0)
$ipPattern = "((\d+\.?){4})"
$ip = ([regex]"inet $ipPattern").Match($ifconfig).Groups[1].Value
if (-not $ip) {
    exit
}
Write-Host $ip

$hostsPath = "$env:windir/system32/drivers/etc/hosts"

$hosts = (Get-Content -Path $hostsPath -Raw -ErrorAction Ignore)
if ($null -eq $hosts) {
    $hosts = ""
}
$hosts = $hosts.Trim()

# update or add wsl ip
$find = "$ipPattern\s+$hostname"
$entry = "$ip $hostname"

if ($hosts -match $find) {
    $hosts = $hosts -replace $find, $entry
}
else {
    $hosts = "$hosts`n$entry".Trim()
}

try {
    $temp = "$hostsPath.new"
    New-Item -Path $temp -ItemType File -Force | Out-Null
    Set-Content -Path $temp $hosts

    Move-Item -Path $temp -Destination $hostsPath -Force
}
catch {
    Write-Error "cannot update wsl ip"
}
```

Save this file as `wsl.ps1` and run it as admin to add an entry for WSL in hosts file.

```cmd
powershell -file wsl.ps1
```


## Automating IP renewal

To refresh the IP address of WSL every time PC or WSL instance restarts we can use Scheduled Tasks.

Watching new entries Event Viewer under _Windows Logs > System_ for _Hyper-V_, we can see a couple of events logged. 

![](wsl-event.png)

The last entry about loading networking driver seems like a good trigger for our script.

Right click the log and click _Attach Task To This Event_ and follow the wizard. Choose _Start a program_ as an action and type 

- Program: `powershell.exe`
- Add arguments: `-file c:/path/to/wsl.ps1`

and complete the wizard.

Open Scheduled Tasks and go to _Task Scheduler Library > Event Viewer Tasks_. Find the task we've just created and open its properties.

- In _General_ tab, check _Run with highest privileges_. Writing inside `%WINDIR%` requires admin privileges, or the script would fail to run.
- In _Conditions_ tab, disable _Start the task only if the computer is on AC power_.

then save the task.

Run the task and check hosts file to see if WSL IP address is added. Also restart WSL instance using:

```powershell
# shutdown
wsl --shutdown
# start
wsl
```
A PowerShell window should pop up and update the IP address.

Now we can access servers running on WSL by `wsl:PORT` when `localhost:PORT` stops working.



[wsl]: https://docs.microsoft.com/en-us/windows/wsl/
[localhost]: https://docs.microsoft.com/en-us/windows/wsl/faq#how-do-i-access-a-port-from-wsl-in-windows
[issues]: https://github.com/microsoft/WSL/issues?q=is%3Aissue+is%3Aopen+localhost
[hosts]: https://en.wikipedia.org/wiki/Hosts_(file)
