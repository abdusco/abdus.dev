---
title: Quick full-text search using SQLite
description: Practical intro to using full-text search in SQLite
tags:
  - post
  - sqlite
  - python
date: 2020-07-02
---


SQLite provides full-text search functionality with [FTS5 extension][fts5] that lets us index columns of a table
then perform searches using keywords against the table.

## Creating FTS tables

We'll start with a common scenario, where we keep a set of blog posts in a `posts` table:

```sql
CREATE TABLE posts
(
    id    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    body  TEXT    NOT NULL
);
```

We want to conduct searches on `title` and `body` columns of a post.
Then the corresponding FTS table definition would be:

```sql
CREATE VIRTUAL TABLE posts_fts USING fts5
(
    title,
    body,
    content=posts
);
```

Here `content=posts` indicate that SQLite will query `posts` table whenever it needs to access column values.
By default SQLite uses `rowid` column to find the row it needs,
but an optional `content_rowid=id` parameter can be specified to instruct to use the preferred key column [^ftsconfig].

## Keeping FTS index up-to-date

We've set up FTS indices, but we need to keep it current,
and for that we'll create a couple of triggers that hook into `posts` table
and add/update/remove content from the index:

```sql
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts
BEGIN
    INSERT INTO posts_fts (rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;

CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts
BEGIN
    INSERT INTO posts_fts (posts_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
END;

CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts
BEGIN
    INSERT INTO posts_fts (posts_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
    INSERT INTO posts_fts (rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
```
Now we can insert new records into `posts` table and FTS index will be populated automatically.

```sql
INSERT INTO posts(title, body)
VALUES ('I daresay that Fry has discovered the smelliest object in the known universe!',
        'Soothe us with sweet lies. You''ve killed me! Oh, you''ve killed me! Good news, everyone! There''s a report on TV with some very bad news! Look, last night was a mistake.'),
       ('Have you ever tried just turning off the TV, sitting down with your children, and hitting them?',
        'Yes. You gave me a dollar and some candy. Professor, make a woman out of me. You seem malnourished. Are you suffering from intestinal parasites? Is the Space Pope reptilian!? I don''t ''need'' to drink. I can quit anytime I want!');
```

## Querying FTS table

Now we can perform full-text searches using FTS table to find matching records, then get the content for those.

```sql
SELECT *
FROM posts
WHERE ROWID IN (SELECT ROWID FROM posts_fts WHERE posts_fts MATCH 'fry' ORDER BY rank);
```

Here we use `<fts_table> match 'term'` to search FTS table
and order the results according to their relevance using `rank` value.

this gives us a match as expected:

```commandline
sqlite> .mode line
sqlite> SELECT *
   ...> FROM posts
   ...> WHERE ROWID IN (SELECT ROWID FROM posts_fts WHERE posts_fts MATCH 'fry' ORDER BY rank);
   id = 1
title = I daresay that Fry has discovered the smelliest object in the known universe!
 body = Soothe us with sweet lies. You've killed me! Oh, you've killed me! Good news, everyone! There's a report on TV with some very bad news! Look, last night was a mistake.
```

SQLite supports a couple of operators in addition to plain search, such as `AND`, `OR`, `NOT`, verbatim `"term"` [^operators].


## Python script

Here's a python script to enable FTS for a table and search against it. Loosely inspired by [sqlite-utils][sqlite-utils]

```python
import sqlite3
from sqlite3 import Connection
from typing import List


def enable_fts(db: Connection, table: str, columns: List[str]):
    column_list = ','.join(f'[{c}]' for c in columns)
    db.executescript('''
        CREATE VIRTUAL TABLE [{table}_fts] USING fts5
        (
            {column_list},
            content=[{table}_fts]
        )'''.format(
        table=table,
        column_list=column_list
    ))

    db.executescript('''
        CREATE TRIGGER [{table}_fts_insert] AFTER INSERT ON posts
        BEGIN
            INSERT INTO [{table}_fts] (rowid, {column_list}) VALUES (new.rowid, {new_columns});
        END;
        CREATE TRIGGER [{table}_fts_delete] AFTER DELETE ON posts
        BEGIN
            INSERT INTO [{table}_fts] ([{table}_fts], rowid, {column_list}) VALUES ('delete', old.rowid, {old_columns});
        END;
        CREATE TRIGGER [{table}_fts_update] AFTER UPDATE ON posts
        BEGIN
            INSERT INTO [{table}_fts] ([{table}_fts], rowid, {column_list}) VALUES ('delete', old.rowid, {old_columns});
            INSERT INTO [{table}_fts] (rowid, {column_list}) VALUES (new.rowid, {new_columns});
        END;
    '''.format(
        table=table,
        column_list=column_list,
        new_columns=','.join(f'new.[{c}]' for c in columns),
        old_columns=','.join(f'old.[{c}]' for c in columns),
    ))


def query(db: Connection, table: str, term: str) -> List[sqlite3.Row]:
    cur = db.execute('''
        SELECT * FROM [{table}]
        WHERE ROWID IN (SELECT ROWID FROM [{table}_fts] WHERE [{table}_fts] MATCH ? ORDER BY rank)
    '''.format(table=table), [term])
    return list(cur.fetchall())
```

[fts5]: https://www.sqlite.org/fts5.html
[sqlite-utils]: https://github.com/simonw/sqlite-utils

[^ftsconfig]: More on [external content](https://www.sqlite.org/fts5.html#external_content_tables)
[^operators]: More on [search syntax](https://www.sqlite.org/fts5.html#full_text_query_syntax)
