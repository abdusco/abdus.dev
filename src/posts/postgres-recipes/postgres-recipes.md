---
title: Postgres recipes
description: Short snippets for common tasks when using PostgreSQL
tags:
  - post
  - postgres
  - sql
date: 2020-06-30T00:00:00.000Z
---
# {{title}}

This is a list of snippets I keep searching and forgetting over and over. I want to believe that writing these down will help me remember easily, at least until I develop muscle memory.

## Creating a database, user and giving permissions

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

## Auto updating timestamp fields

For a table with timestamp columns like this:
```sql
create table records(
    date_updated TIMESTAMP
);
```
First create a function that generates a trigger updating timestamp.

```sql
CREATE OR REPLACE FUNCTION trigger_update_timestamps()
    RETURNS TRIGGER AS
$$
BEGIN
    new.date_updated = now();
    RETURN new;
END
$$ LANGUAGE plpgsql;
```

then create a trigger that runs table before update operations.

```sql
DROP TRIGGER IF EXISTS update_timestamps on records;
CREATE TRIGGER update_timestamps
    BEFORE UPDATE
    ON records
    FOR EACH ROW
EXECUTE PROCEDURE trigger_update_timestamps();
```