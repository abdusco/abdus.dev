---
title: PowerShell aliases
date: 2020-05-18
tags:
    - powershell
    - til
    - post
---

A list of current aliases can be retrieved using [`Get-Alias`][docs] command.

| Alias | Command |
| ----- | ------- |
{% for alias, command in aliases -%}
| `{{ alias }}` | `{{ command }}` |
{% endfor %}


[docs]: https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-alias