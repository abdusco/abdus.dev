---
title: SSH Agent
description: Use ssh without copying keys everywhere.
date: 2019-12-28
tags:
    - ssh
    - til
    - post
---

# {{ title }}

I have several servers that I use to host my projects. Sometimes I need to move data between the
servers, but realizing a server is missing an SSH key to another is annoying. This is where SSH
agent comes into play. It holds a keychain for SSH keys you choose and forwards them as you ssh
between the servers. No more using `ssh-copy-id` or manually editing `~/.ssh/authorized_keys`.  
 
I'm also fan of [fish shell][fish]. It's quite handy, but poses a difficulty when using snippets
from the internet. 
 
## Usage 
Running `ssh-agent` sets a few environment variables. `ssh-add` adds default SSH key to keychain
. `eval` is for running the commands manually in fish shell that would work natively in
 bash.

```bash
eval (ssh-agent -c)
ssh-add
```

running these gives:

```bash
abdus@home ~> eval (ssh-agent -c)
Agent pid 7282
abdus@home ~> ssh-add
Identity added: /home/abdus/.ssh/id_rsa (/home/abdus/.ssh/id_rsa)
```

After setting up the agent, we can connect to a server from a different server without setting up
 SSH keys first.
 
```shell
abdus@home ~> eval (ssh-agent -c)
abdus@home ~> ssh-add
abdus@home ~> ssh abdus@server1
abdus@server1 ~> ssh abdus@server2
abdus@server2 ~> # it works!
``` 



[fish]: https://fishshell.com/
