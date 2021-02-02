---
title: Detecting USB drive insertion & removal on Windows using Python
description: Monitor new drives on Windows and perform tasks
date: 2020-06-28
tags: 
    - python
    - windows
    - post
---

I was looking for a way to monitor USB drives and trigger a backup when I plug in my backup drive.
Most solutions online describe a way to do it in C# or C++, but I wanted to write one in Python.

[My first naive attempt](#alternative-approach%3A-polling-for-drives) was to get the list of drives, and poll for changes every couple of seconds. I've explained this method below and it works fine. 

However I wasn't really comfortable with launching a subprocess every second. It seemed wasteful.
So I've written a second method that uses Win32 APIs to hook into Windows and monitor drive changes.

## Getting a list of drives

Windows provides an interface for sysadmins called [Windows Management Instrumentation][wmi] (WMI) which basically allows you to monitor a local or remote system.

On PowerShell we can use [`Get-WmiObject`][Get-WmiObject] command to interact with it.
WMI [`Win32_LogicalDisk`][Win32_LogicalDisk] class gives us a list of the drives currently connected to the PC.

```powershell
PS > Get-WmiObject -Class Win32_LogicalDisk

DeviceID     : C:
DriveType    : 3
ProviderName :
FreeSpace    : 21341257728
Size         : 130417745920
VolumeName   :

...

DeviceID     : E:
DriveType    : 2
ProviderName :
FreeSpace    : 48837689344
Size         : 62706155520
VolumeName   : ABDUS
```

That's a lot of useful information 👌. We can use [`DriveType`][wmi_blog] to determine if a drive is removable or not.

:::table
|DriveType|Description|
|--:|--|
|`0`|Unknown|
|`1`|No Root Directory|
|**`2`**|**Removable Disk**|
|`3`|Local Disk|
|`4`|Network Drive|
|`5`|Compact Disc|
|`6`|RAM Disk|
:::

Finally, we can pick the fields we need and convert the command result to JSON so that Python can easily parse it.

```powershell
PS > Get-WmiObject -Class Win32_LogicalDisk | Select-Object deviceid,volumename,drivetype | ConvertTo-Json
```
```json
[
  {
    "DeviceID": "C:",
    "VolumeName": "",
    "DriveType": 3
  },
  {
    "DeviceID": "E:",
    "VolumeName": "ABDUS",
    "DriveType": 2
  },
  ...
]
```

Now we can call this PowerShell command from Python using [`subprocess`][subprocess] module and parse its JSON output:

```python
from dataclasses import dataclass
from typing import Callable, List

@dataclass
class Drive:
    letter: str
    label: str
    drive_type: str

    @property
    def is_removable(self) -> bool:
        return self.drive_type == 'Removable Disk'

def list_drives() -> List[Drive]:
    """
    Get a list of drives using WMI
    :return: list of drives
    """
    proc = subprocess.run(
        args=[
            'powershell',
            '-noprofile',
            '-command',
            'Get-WmiObject -Class Win32_LogicalDisk | Select-Object deviceid,volumename,drivetype | ConvertTo-Json'
        ],
        text=True,
        stdout=subprocess.PIPE
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        print('Failed to enumerate drives')
        return []
    devices = json.loads(proc.stdout)

    drive_types = {
        0: 'Unknown',
        1: 'No Root Directory',
        2: 'Removable Disk',
        3: 'Local Disk',
        4: 'Network Drive',
        5: 'Compact Disc',
        6: 'RAM Disk',
    }

    return [Drive(
        letter=d['deviceid'],
        label=d['volumename'],
        drive_type=drive_types[d['drivetype']]
    ) for d in devices]

if __name__ == '__main__':
    print(list_drives())
```
which outputs
```
[Drive(letter='C:', label='', drive_type='Local Disk'), ...]
```

OK. Now the difficult part: hooking it up to Windows.

## Listening to Windows `WM_DEVICECHANGE` messages

Windows uses [messages][win32_messages] to notify programs of events and let them react. This includes user inputs (mouse clicks, key strokes etc.) and other OS events (hardware connected, low power, A/C adapter connected etc.). 

Windows broadcasts a [`WM_DEVICECHANGE` message][WM_DEVICECHANGE] when hardware configuration of the system changes. That includes plug-and-play devices, such as USB drives, printers, mouse etc. We need a way to listen to this broadcast. That requires creating a window, registering a window procedure, then running a message loop that receives messages from the operating system.

We need the [`pywin32`][pywin32] package, which provides extensions to consume Win32 APIs in Python. We can install it with pip:

```shell
pip install pywin32
```

To create a window, we can follow [Microsoft's docs][docs_create_window] and translate the given C++ example to its Python equivalent.

```python;lines=13
import win32api, win32con, win32gui

def create_window() -> int:
    """
    Create a window for listening to messages
    https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-createwindowexa#example
    
    See also: https://docs.microsoft.com/en-us/windows/win32/learnwin32/creating-a-window#creating-the-window

    :return: window hwnd
    """
    wc = win32gui.WNDCLASS()
    wc.lpfnWndProc = print
    wc.lpszClassName = 'Demo'
    wc.hInstance = win32api.GetModuleHandle(None)
    class_atom = win32gui.RegisterClass(wc)
    return win32gui.CreateWindow(class_atom, 'Demo', 0, 0, 0, 0, 0, 0, 0, wc.hInstance, None)

if __name__ == '__main__':
    create_window()
    win32gui.PumpMessages()
```

The highlighted line is the critical part. It is our ["window procedure"][window_procedure] that gets called when the window receives a message. 
It must have the following signature:

```c++
LRESULT CALLBACK MainWndProc(
    HWND hwnd,        // handle to window
    UINT uMsg,        // message identifier
    WPARAM wParam,    // first message parameter
    LPARAM lParam)    // second message parameter
{ ... }
```

Python's `print` function accepts an arbitrary number of parameters and dumps all its arguments to console, so its signature is compatible. 

Once we run this script we can see the messages received by our window:

```
789538 537 7 0
789538 537 32772 346174713248
...
```

All these integers are either a value or a pointer to a value. Let's break down the second message:

::: table
|Parameter|Value|Hexadecimal|Description|
|--|--|--|--|
|`hwnd`|`789538`|`0xc0c22`|our window's handle|
|`msg`|`537`|`0x0219`|[`WM_DEVICECHANGE`][WM_DEVICECHANGE] message|
|`wparam`|`32772`|`0x8004`|[`DBT_DEVICEREMOVECOMPLETE`][DBT_DEVICEREMOVECOMPLETE] event|
|`lparam`|`346174713248`|`0x50999eeda0`|pointer (memory address) to event info|
:::

Once we decipher the message type, we can google its hexadecimal value to find which message it corresponds to, then figure out what it contains. Here we don't really need to dereference and unpack `lparam` pointer, because [we're using WMI](#getting-a-list-of-drives) for that. We just need to know something has happened.

`WM_DEVICECHANGE` message gives us `DBT_DEVICEARRIVAL` and `DBT_DEVICEREMOVECOMPLETE` events to notify when a device is added or removed respectively.

Now putting these all together:

## Python script

I wrapped the code I've explained above inside `DeviceListener` class. It provides an easy way to attach your own listener and perform a task when a drive is attached/removed.

It assumes the script will be run as the main script, that's why `DeviceListener.start()` is blocking. You can run it inside a thread if you want it to be non-blocking.

You can also change the highlighted line to trigger the callback only when a drive is either inserted or removed.

```python;lines=77
import json
import logging
import subprocess
from dataclasses import dataclass
from typing import Callable, List

import win32api, win32con, win32gui

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Drive:
    letter: str
    label: str
    drive_type: str

    @property
    def is_removable(self) -> bool:
        return self.drive_type == 'Removable Disk'


class DeviceListener:
    """
    Listens to Win32 `WM_DEVICECHANGE` messages
    and trigger a callback when a device has been plugged in or out

    See: https://docs.microsoft.com/en-us/windows/win32/devio/wm-devicechange
    """
    WM_DEVICECHANGE_EVENTS = {
        0x0019: ('DBT_CONFIGCHANGECANCELED', 'A request to change the current configuration (dock or undock) has been canceled.'),
        0x0018: ('DBT_CONFIGCHANGED', 'The current configuration has changed, due to a dock or undock.'),
        0x8006: ('DBT_CUSTOMEVENT', 'A custom event has occurred.'),
        0x8000: ('DBT_DEVICEARRIVAL', 'A device or piece of media has been inserted and is now available.'),
        0x8001: ('DBT_DEVICEQUERYREMOVE', 'Permission is requested to remove a device or piece of media. Any application can deny this request and cancel the removal.'),
        0x8002: ('DBT_DEVICEQUERYREMOVEFAILED', 'A request to remove a device or piece of media has been canceled.'),
        0x8004: ('DBT_DEVICEREMOVECOMPLETE', 'A device or piece of media has been removed.'),
        0x8003: ('DBT_DEVICEREMOVEPENDING', 'A device or piece of media is about to be removed. Cannot be denied.'),
        0x8005: ('DBT_DEVICETYPESPECIFIC', 'A device-specific event has occurred.'),
        0x0007: ('DBT_DEVNODES_CHANGED', 'A device has been added to or removed from the system.'),
        0x0017: ('DBT_QUERYCHANGECONFIG', 'Permission is requested to change the current configuration (dock or undock).'),
        0xFFFF: ('DBT_USERDEFINED', 'The meaning of this message is user-defined.'),
    }

    def __init__(self, on_change: Callable[[List[Drive]], None]):
        self.on_change = on_change

    def _create_window(self):
        """
        Create a window for listening to messages
        https://docs.microsoft.com/en-us/windows/win32/learnwin32/creating-a-window#creating-the-window

        See also: https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-createwindoww

        :return: window hwnd
        """
        wc = win32gui.WNDCLASS()
        wc.lpfnWndProc = self._on_message
        wc.lpszClassName = self.__class__.__name__
        wc.hInstance = win32api.GetModuleHandle(None)
        class_atom = win32gui.RegisterClass(wc)
        return win32gui.CreateWindow(class_atom, self.__class__.__name__, 0, 0, 0, 0, 0, 0, 0, wc.hInstance, None)

    def start(self):
        logger.info(f'Listening to drive changes')
        hwnd = self._create_window()
        logger.debug(f'Created listener window with hwnd={hwnd:x}')
        logger.debug(f'Listening to messages')
        win32gui.PumpMessages()

    def _on_message(self, hwnd: int, msg: int, wparam: int, lparam: int):
        if msg != win32con.WM_DEVICECHANGE:
            return 0
        event, description = self.WM_DEVICECHANGE_EVENTS[wparam]
        logger.debug(f'Received message: {event} = {description}')
        if event in ('DBT_DEVICEREMOVECOMPLETE', 'DBT_DEVICEARRIVAL'):
            logger.info('A device has been plugged in (or out)')
            self.on_change(self.list_drives())
        return 0

    @staticmethod
    def list_drives() -> List[Drive]:
        """
        Get a list of drives using WMI
        :return: list of drives
        """
        proc = subprocess.run(
            args=[
                'powershell',
                '-noprofile',
                '-command',
                'Get-WmiObject -Class Win32_LogicalDisk | Select-Object deviceid,volumename,drivetype | ConvertTo-Json'
            ],
            text=True,
            stdout=subprocess.PIPE
        )
        if proc.returncode != 0 or not proc.stdout.strip():
            logger.error('Failed to enumerate drives')
            return []
        devices = json.loads(proc.stdout)

        drive_types = {
            0: 'Unknown',
            1: 'No Root Directory',
            2: 'Removable Disk',
            3: 'Local Disk',
            4: 'Network Drive',
            5: 'Compact Disc',
            6: 'RAM Disk',
        }

        return [Drive(
            letter=d['deviceid'],
            label=d['volumename'],
            drive_type=drive_types[d['drivetype']]
        ) for d in devices]


def on_devices_changed(drives: List[Drive]):
    removable_drives = [d for d in drives if d.is_removable]
    logger.debug(f'Connected removable drives: {removable_drives}')
    for drive in removable_drives:
        backup(drive)


def backup(drive: Drive):
    if drive.label != 'ABDUS':
        return
    logger.info('Backup drive has been plugged in')
    logger.info(f'Backing up {drive.letter}')


if __name__ == '__main__':
    listener = DeviceListener(on_change=on_devices_changed)
    listener.start()
```

When we run it and plug in a drive, it logs:

```text
INFO:__main__:Listening to drive changes
DEBUG:__main__:Created listener window with hwnd=d60b86
DEBUG:__main__:Listening to messages
DEBUG:__main__:Received message: DBT_DEVNODES_CHANGED = A device has been added to or removed from the system.
DEBUG:__main__:Received message: DBT_DEVNODES_CHANGED = A device has been added to or removed from the system.
DEBUG:__main__:Received message: DBT_DEVICEARRIVAL = A device or piece of media has been inserted and is now available.
INFO:__main__:A device has been plugged in (or out)
DEBUG:__main__:Connected removable drives: [Drive(letter='E:', label='ABDUS', drive_type='Removable Disk')]
INFO:__main__:Backup drive has been plugged in
INFO:__main__:Backing up E:
```

It works 🙌.

Now what you do when your callback is called is up to you. You can:

- Copy files to/from the drive
- Backup photos when an SD card is inserted
- Display a popup to warn the user
- Lock the PC
- Wipe the drive (🤷‍♀️ you do you)
- ...

## Alternative approach: polling for drives

This is my older attempt where I poll disks and trigger a callback when the set of drives change. It's considerably simpler, doesn't depend on [`pywin32`][pywin32] and easier to port to other OSs (provided you know how to list drives on that platform).

```python
import json
import subprocess
from dataclasses import dataclass
from typing import Callable, List


@dataclass
class Drive:
    letter: str
    label: str
    drive_type: str

    @property
    def is_removable(self) -> bool:
        return self.drive_type == 'Removable Disk'


def list_drives() -> List[Drive]:
    """
    Get a list of drives using WMI
    :return: list of drives
    """
    proc = subprocess.run(
        args=[
            'powershell',
            '-noprofile',
            '-command',
            'Get-WmiObject -Class Win32_LogicalDisk | Select-Object deviceid,volumename,drivetype | ConvertTo-Json'
        ],
        text=True,
        stdout=subprocess.PIPE
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        print('Failed to enumerate drives')
        return []
    devices = json.loads(proc.stdout)

    drive_types = {
        0: 'Unknown',
        1: 'No Root Directory',
        2: 'Removable Disk',
        3: 'Local Disk',
        4: 'Network Drive',
        5: 'Compact Disc',
        6: 'RAM Disk',
    }

    return [Drive(
        letter=d['deviceid'],
        label=d['volumename'],
        drive_type=drive_types[d['drivetype']]
    ) for d in devices]

def watch_drives(on_change: Callable[[List[Drive]], None], poll_interval: int = 1):
    prev = None
    while True:
        drives = list_drives()
        if prev != drives:
            on_change(drives)
            prev = drives
        sleep(poll_interval)


if __name__ == '__main__':
    watch_drives(on_change=print)
```

You can supply your own `on_change` callback and perform a job if a drive is present.

Here's the output after I plug a USB drive in and out: 
```text
[Drive(letter='C:', label='', drive_type='Local Disk')]
[Drive(letter='C:', label='', drive_type='Local Disk'), Drive(letter='E:', label='ABDUS', drive_type='Removable Disk')]
[Drive(letter='C:', label='', drive_type='Local Disk')]
```

That's it.  

--- 

If you've found this post useful, consider sharing it.


[WM_DEVICECHANGE]: https://docs.microsoft.com/en-us/windows/win32/devio/wm-devicechange#parameters
[docs_create_window]: https://docs.microsoft.com/en-us/windows/win32/learnwin32/creating-a-window
[window_procedure]: https://docs.microsoft.com/en-us/windows/win32/winmsg/using-window-procedures
[DBT_DEVICEREMOVECOMPLETE]: https://docs.microsoft.com/en-us/windows/win32/devio/dbt-deviceremovecomplete
[Win32_LogicalDisk]: https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-logicaldisk
[wmi]: https://docs.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page
[wmi_blog]: https://devblogs.microsoft.com/scripting/inventory-drive-types-by-using-powershell/
[subprocess]: https://docs.python.org/3/library/subprocess.html#subprocess.run
[pywin32]: https://github.com/mhammond/pywin32
[Get-WmiObject]: https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-wmiobject
[win32_messages]: https://docs.microsoft.com/en-us/windows/win32/learnwin32/window-messages