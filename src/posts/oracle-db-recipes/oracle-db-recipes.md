---
title: Oracle DB recipes
description: Collection of snippets for setting up and using Oracle DB
tags:
  - post
  - sql
date: 2020-08-08
---
# {{ title }}

I (have to) use Oracle at work. I simply hate it. Its interface, how everything is much harder than it needs to be, lack of support for modern features, arbitrary limitations. There's not much documentation online apart from some ancient posts from enterprise consultancy firms and occasional StackOverflow questions. I hope I learn it soon enough that I won't need to refer to this post as much.

## Creating a user

```sql
create user myuser identified by "mypassword";
grant resource, connect, create view, create session, create table, create view, create procedure, create sequence, unlimited tablespace to myuser;
```

From what I understand, creating a user automatically creates a table space (like a namespace) for that user, and that isolates that user's tables from the others.

When you connect using these credentials using DataGrip[^datagrip], you will see only 

[^datagrip]: Jetbrains' unrivaled database management tool. It's integrated to all IDEs Jetbrains offers. Simply access it from `[Ctrl] + [E]` then type `database` and `[Enter]`. A panel will open on right that you can then add databases and get to work.