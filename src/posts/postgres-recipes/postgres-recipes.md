---
title: Postgres recipes
description: Short snippets for common tasks when using PostgreSQL
tags:
  - post
  - postgres
  - sql
date: 2020-06-30T00:00:00.000Z
---
This is a list of snippets I keep searching and forgetting over and over. I want to write these down to easily remember. 

# Creating a database, user and giving permissions

```sql
CREATE DATABASE demo;
CREATE USER demo_user WITH ENCRYPTED PASSWORD 'secret';
GRANT ALL PRIVILEGES ON DATABASE demo TO demo_user;
```

Another approach is to create user first:

```sql
CREATE USER demo_user WITH ENCRYPTED PASSWORD 'secret';
CREATE DATABASE demo OWNER demo_user;
```
