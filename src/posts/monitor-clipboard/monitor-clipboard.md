---
title: Monitoring clipboard contents on Windows with Python
description: A guide on using Win32 APIs to build a clipboard listener that triggers a callback when the clipboard content changes
tags:
  - python
  - windows
  - post
date: 2020-11-30
---

I was looking for ways to listen to the clipboard and get called for updates as its content changes. 
I found a couple of ways to achieve this in Python. Some solutions poll for changes, others use ctypes and Win32 APIs. 

Working with C bindings in Python is frustrating. The debugger doesn't work well with pointers and C types. You have to build your own C structs to unpack a pointer. Win32 APIs are no exception, as they're written in C/C++ and Python is probably not the best language to use them. But still, it works well enough for our purposes.

We'll explore how do to it in Python using Win32 APIs, or alternatively integrating [a utility](#using-dumpclip-polling-for-changes) I've written in C# that retrieves clipboard contents or streams updates to it. I had written this earlier when I didn't know much about Win32 APIs or how to use them, but it still functions well, so I'm leaving it here in this post as reference.

To make working with Win32 APIs easier, we need to install [`pywin32`][pywin32] package which provides most of the primitives and types for Win32 APIs, though it's not a strict dependency.


## Monitoring clipboard updates

Windows provides a couple of methods for data exchange between applications. Clipboard is one of them. All applications have access to it. But we first need to create a primitive "application" that Windows recognizes. We subscribe it for the clipboard updates.

Windows uses **window**s (hah!) as the building block of applications. I've written about how windows and messaging works on Windows in [another post][post_usb] where I explored USB hotplugging events, which might be worth reading. 

Let's create a window, and set `print` function as its [window procedure][window_procedure]:

```python
import win32api, win32gui

def create_window() -> int:
    """
    Create a window for listening to messages
    :return: window hwnd
    """
    wc = win32gui.WNDCLASS()
    wc.lpfnWndProc = print
    wc.lpszClassName = 'demo'
    wc.hInstance = win32api.GetModuleHandle(None)
    class_atom = win32gui.RegisterClass(wc)
    return win32gui.CreateWindow(class_atom, 'demo', 0, 0, 0, 0, 0, 0, 0, wc.hInstance, None)

if __name__ == '__main__':
    hwnd = create_window()
    win32gui.PumpMessages()
```

When we run it doesn't do much except to dump messages sent by Windows to console. We receive the first message `WM_DWMNCRENDERINGCHANGED`, which doesn't concern us.

We need to register this window as a "clipboard format listener" using [`AddClipboardFormatListener`][AddClipboardFormatListener] API, to get notified by Windows whenever the contents of the clipboard change.

```python
import ctypes
# ...

if __name__ == '__main__':
    hwnd = create_window()
    ctypes.windll.user32.AddClipboardFormatListener(hwnd)
    win32gui.PumpMessages()
```

Now when we run this, it still prints the previous message, but when you copy something to the clipboard it receives another message:

```console;lines=2
2033456 799 1 0
2033456 797 8 0
```

Decoding the second message:

|Value|Hex|Message|
|--|--|--|
|`797`|`0x031D`|`WM_CLIPBOARDUPDATE` 🥳|

We've received a [`WM_CLIPBOARDUPDATE`][WM_CLIPBOARDUPDATE] message notifying us that the clipboard content has changed. Now we can build our script around it.

```python
import threading
import ctypes
import win32api, win32gui

class Clipboard:
    def _create_window(self) -> int:
        """
        Create a window for listening to messages
        :return: window hwnd
        """
        wc = win32gui.WNDCLASS()
        wc.lpfnWndProc = self._process_message
        wc.lpszClassName = self.__class__.__name__
        wc.hInstance = win32api.GetModuleHandle(None)
        class_atom = win32gui.RegisterClass(wc)
        return win32gui.CreateWindow(class_atom, self.__class__.__name__, 0, 0, 0, 0, 0, 0, 0, wc.hInstance, None)

    def _process_message(self, hwnd: int, msg: int, wparam: int, lparam: int):
        WM_CLIPBOARDUPDATE = 0x031D
        if msg == WM_CLIPBOARDUPDATE:
            print('clipboard updated!')
        return 0

    def listen(self):
        def runner():
            hwnd = self._create_window()
            ctypes.windll.user32.AddClipboardFormatListener(hwnd)
            win32gui.PumpMessages()

        th = threading.Thread(target=runner, daemon=True)
        th.start()
        while th.is_alive():
            th.join(0.25)

if __name__ == '__main__':
    clipboard = Clipboard()
    clipboard.listen()
```

One thing we need to watch out for is that because `win32gui.PumpMessages()` is blocking, we cannot stop the script using [[Ctrl]] + [[C]]. So we run it inside a thread, which lets `KeyboardInterrupt` to bubble up and terminate the script.

When we run it, and copy something (text, files) and check the console, we can see it prints `clipboard updated!`.

Now that we have the notification working, let's retrieve the what's actually in the clipboard.

## Getting clipboard contents

[Windows clipboard][win32_using_clipboard] has a concept called ["clipboard format"][win32_clipboard_formats]. When you copy something, (depending on application) the payload is also attached a bunch of metadata, allowing it to be used in various contexts. For example, when you copy a table from a webpage, you have the option to paste it as plain text, or paste it in Excel and have it formatted as a table. You can copy files, images, screenshots into the clipboard and each payload gets stored formatted (again, depending on how the application sets the clipboard content).

Therefore, if we want to get the clipboard contents, we need to specify which format we want in. For now, we'll be dealing with:


:::table
|Format|Value|Description|
|--|--|--|
|`CF_UNICODETEXT`|`13`|Unicode text format|
|`CF_TEXT`|`1`|Text format for ANSI text|
|`CF_HDROP`|`15`|List of files|
|`CF_BITMAP`|`2`|Images e.g. screenshots|
:::

To read the clipboard, we'll use [`OpenClipboard`][OpenClipboard] to set a lock first. This ensures other programs can't modify the clipboard while we're trying to read it. We need to release the lock with [`CloseClipboard`][CloseClipboard] once we're done.

Then we'll call [`IsClipboardFormatAvailable`][IsClipboardFormatAvailable] to query a format, then get its contents using [`GetClipboardData`][GetClipboardData], or fallback to other formats.

```python
from pathlib import Path
from dataclasses import dataclass
from typing import Union, List, Optional

import win32clipboard, win32con

@dataclass
class Clip:
    type: str
    value: Union[str, List[Path]]
    
def read_clipboard() -> Optional[Clip]:
    try:
        win32clipboard.OpenClipboard()
        if win32clipboard.IsClipboardFormatAvailable(win32con.CF_HDROP):
            data: tuple = win32clipboard.GetClipboardData(win32con.CF_HDROP)
            return Clip('files', [Path(f) for f in data])
        elif win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
            data: str = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
            return Clip('text', data)
        elif win32clipboard.IsClipboardFormatAvailable(win32con.CF_TEXT):
            data: bytes = win32clipboard.GetClipboardData(win32con.CF_TEXT)
            return Clip('text', data.decode())
        elif win32clipboard.IsClipboardFormatAvailable(win32con.CF_BITMAP):
            # TODO: handle screenshots
            pass
        return None
    finally:
        win32clipboard.CloseClipboard()

if __name__ == '__main__':
    print(read_clipboard())
```

When we run it, and try copying some text or files, it prints the contents to the console:

```console
Clip(type='text', value='read_clipboard')
Clip(type='files', value=[WindowsPath('C:/Python39/vcruntime140_1.dll'), WindowsPath('C:/Python39/python.exe')])
```

Now let's bring it all together:

## Clipboard listener in Python

I've placed `read_clipboard` inside `Clipboard` class, which creates a window and subscribes to clipboard updates. When the clipboard content changes, it triggers suitable callbacks with the parsed content.

For convenience, you can enable `trigger_at_start` to trigger callbacks with the current clipboard content immediately after listening.

```python
import ctypes
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Union, List, Optional

import win32api, win32clipboard, win32con, win32gui

class Clipboard:
    @dataclass
    class Clip:
        type: str
        value: Union[str, List[Path]]

    def __init__(
            self,
            trigger_at_start: bool = False,
            on_text: Callable[[str], None] = None,
            on_update: Callable[[Clip], None] = None,
            on_files: Callable[[str], None] = None,
    ):
        self._trigger_at_start = trigger_at_start
        self._on_update = on_update
        self._on_files = on_files
        self._on_text = on_text

    def _create_window(self) -> int:
        """
        Create a window for listening to messages
        :return: window hwnd
        """
        wc = win32gui.WNDCLASS()
        wc.lpfnWndProc = self._process_message
        wc.lpszClassName = self.__class__.__name__
        wc.hInstance = win32api.GetModuleHandle(None)
        class_atom = win32gui.RegisterClass(wc)
        return win32gui.CreateWindow(class_atom, self.__class__.__name__, 0, 0, 0, 0, 0, 0, 0, wc.hInstance, None)

    def _process_message(self, hwnd: int, msg: int, wparam: int, lparam: int):
        WM_CLIPBOARDUPDATE = 0x031D
        if msg == WM_CLIPBOARDUPDATE:
            self._process_clip()
        return 0

    def _process_clip(self):
        clip = self.read_clipboard()
        if not clip:
            return

        if self._on_update:
            self._on_update(clip)
        if clip.type == 'text' and self._on_text:
            self._on_text(clip.value)
        elif clip.type == 'files' and self._on_text:
            self._on_files(clip.value)
    
    @staticmethod
    def read_clipboard() -> Optional[Clip]:
        try:
            win32clipboard.OpenClipboard()

            def get_formatted(fmt):
                if win32clipboard.IsClipboardFormatAvailable(fmt):
                    return win32clipboard.GetClipboardData(fmt)
                return None

            if files := get_formatted(win32con.CF_HDROP):
                return Clipboard.Clip('files', [Path(f) for f in files])
            elif text := get_formatted(win32con.CF_UNICODETEXT):
                return Clipboard.Clip('text', text)
            elif text_bytes := get_formatted(win32con.CF_TEXT):
                return Clipboard.Clip('text', text_bytes.decode())
            elif bitmap_handle := get_formatted(win32con.CF_BITMAP):
                # TODO: handle screenshots
                pass

            return None
        finally:
            win32clipboard.CloseClipboard()

    def listen(self):
        if self._trigger_at_start:
            self._process_clip()

        def runner():
            hwnd = self._create_window()
            ctypes.windll.user32.AddClipboardFormatListener(hwnd)
            win32gui.PumpMessages()

        th = threading.Thread(target=runner, daemon=True)
        th.start()
        while th.is_alive():
            th.join(0.25)


if __name__ == '__main__':
    clipboard = Clipboard(on_update=print, trigger_at_start=True)
    clipboard.listen()
```

When we run it and copy some text, or some files, it dumps the clipboard content just as we want it.

```console
Clipboard.Clip(type='text', value='Clipboard')
Clipboard.Clip(type='files', value=[WindowsPath('C:/Python39/python.exe')])
```

I haven't managed to retrieve bitmap from the clipboard when taking a screenshot yet, though it shouldn't be too difficult. 

It should prove useful for the use case where when you take a screenshot, you can save it automatically as PNG, upload it and copy its URL to clipboard, ready for pasting.


## Using **dumpclip**: polling for changes

Before I could navigate around Win32 APIs easily, I used higher level APIs provided in C# to listen to the clipboard. On that end, I created a mini utility called [**dumpclip**][dumpclip] that prints the clipboard content to console as JSON or streams clipboard updates.

The first version of **dumpclip** had a single function: dumping the clipboard content to console as JSON. 

```powershell
> dumpclip.v1.exe
{"text":"monitor"}
```

Calling it from Python is quite straightforward using `subprocess` module. But that also meant polling for changes every second.

```python
import json
import subprocess
import threading
from time import sleep
from typing import Callable


def get_clipboard() -> dict:
    proc = subprocess.run(
        ["dumpclip.v1.exe"],
        stdout=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        return {}
    return json.loads(proc.stdout)


def monitor_clipboard(on_change: Callable[[dict], None]) -> None:
    def monitor():
        old = None
        while True:
            new = get_clipboard()
            if old != new:
                on_change(new)
                old = new
            sleep(1)

    th = threading.Thread(target=monitor)
    th.start()

    th.join()


if __name__ == "__main__":
    monitor_clipboard(on_change=print)

```

It's functional, but we can do better.


## Using **dumpclip**: streaming clipboard updates

The second iteration of **dumpclip** involved using Win32 APIs. I've used [`AddClipboardFormatListener`][AddClipboardFormatListener] to register a callback for clipboard changes in C#, then retrieved & dumped its content as the new content came in.

```powershell
> dumpclip.v2.exe --listen
{"text":"ClipboardChanged"}
{"text":"monitor"}
{"files":["D:\\path\\to\\file.ext"]}
...
```

This worked much better. I can process its `stdout` stream, and trigger a callback directly, instead of polling for changes. But **dumpclip** launched in listener mode never terminates. We need to read its stdout in real-time.

To stream `stdout` of a process, we need to launch it with `subprocess.Popen` and pipe its output to `subprocess.PIPE`.
Then we can read its `stdout` in a separate thread. Because, the main thread that launches the process will be waiting for the process to terminate (although it never will).

```python
import json
import subprocess
import threading
from typing import Callable

def monitor_clipboard(on_change: Callable[[dict], None]) -> None:
    def read_stdout(proc: subprocess.Popen):
        for line in iter(proc.stdout.readline, ""):
            if line.strip():
                payload = json.loads(line)
                on_change(payload)

    proc = subprocess.Popen(
        ["dumpclip.v2.exe", "--listen"],
        text=True,
        stdout=subprocess.PIPE,
    )
    th = threading.Thread(
        target=read_stdout,
        args=(proc,),
    )
    th.start()
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.kill()
        raise

if __name__ == "__main__":
    monitor_clipboard(on_change=print)
```

Because the process doesn't terminate, the thread that consumes its output doesn't stop, either. 
It keeps processing the output as new content comes in, and idles if there's nothing to consume, as `proc.stdout.readline()` call is blocking.
When the process gets killed, `proc.stdout` stops blocking and the thread terminates.

To prevent blocking interrupt signal and to allow the script and the process terminate, we need to `.wait()` the subprocess. This allows `KeyboardInterrupt` to bubble up and terminate the script (and its subprocesses) when we hit [[Ctrl]] + [[C]].


## Using dumpclip: async workflow

Just for kicks, I wanted to implement the same operation in async. It turned out to be more straightforward to write and consume. One caveat is that you have to create a wrapper async function to use `async`/`await` keywords, so I had to add a `main` function to do that.

```python
import asyncio
import json
from pathlib import Path
from typing import AsyncIterable

async def monitor_clipboard() -> AsyncIterable[dict]:
    proc = await asyncio.subprocess.create_subprocess_exec(
        "dumpclip.exe",
        "--listen",
        cwd=str(Path(__file__).parent.resolve()),
        stdout=asyncio.subprocess.PIPE,
    )

    while True:
        if raw_bytes := await proc.stdout.readline():
            text = raw_bytes.decode().strip()
            if text:
                yield json.loads(text)

if __name__ == "__main__":
    async def main():
        async for clip in monitor_clipboard():
            print(clip)

    asyncio.get_event_loop().run_until_complete(main())
```

That's it.  
Cheers ✌

:::text--small
If you've found this post useful, consider sharing it.
:::


[dumpclip]: https://abdus.dev/projects/dumpclip/
[AddClipboardFormatListener]: https://docs.microsoft.com/en-us/windows/win32/dataxchg/using-the-clipboard#creating-a-clipboard-format-listener
[pywin32]: https://github.com/mhammond/pywin32
[win32_using_clipboard]: https://docs.microsoft.com/en-us/windows/win32/dataxchg/using-the-clipboard#creating-a-clipboard-format-listener
[post_usb]: /posts/python-monitor-usb/#listening-to-windows-wm_devicechange-messages
[WM_CLIPBOARDUPDATE]: https://docs.microsoft.com/en-us/windows/win32/dataxchg/wm-clipboardupdate
[win32_clipboard_formats]: https://docs.microsoft.com/en-us/windows/win32/dataxchg/standard-clipboard-formats#constants
[IsClipboardFormatAvailable]: https://docs.microsoft.com/en-us/windows/desktop/api/Winuser/nf-winuser-isclipboardformatavailable
[OpenClipboard]: https://docs.microsoft.com/en-us/windows/desktop/api/Winuser/nf-winuser-openclipboard
[CloseClipboard]: https://docs.microsoft.com/en-us/windows/desktop/api/Winuser/nf-winuser-closeclipboard
[GetClipboardData]: https://docs.microsoft.com/en-us/windows/desktop/api/Winuser/nf-winuser-getclipboarddata
[window_procedure]: https://docs.microsoft.com/en-us/windows/win32/winmsg/using-window-procedures
[clipboard_format_html]: https://docs.microsoft.com/en-us/windows/win32/dataxchg/html-clipboard-format