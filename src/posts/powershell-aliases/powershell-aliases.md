---
title: PowerShell aliases
date: 2020-05-18
tags:
    - powershell
    - til
    - post
---

# {{title}}

A list of current aliases can be retrieved using `Get-Alias` command.

| Alias | Command |
| ----- | ------- |
{% for alias, command in aliases -%}
| `{{ alias }}` | `{{ command }}` |
{% endfor %}

