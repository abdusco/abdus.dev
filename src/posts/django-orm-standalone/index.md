---
title: Using Django ORM without the framework
description: Use Django ORM in any Python project and run queries & migrations easily
tags:
  - python
  - django
  - post
date: 2021-10-21
---

Django's ORM is really simple to use and migrations support is great. When I modify a model and run `makemigrations` it generates a migration from the changes, and I can apply it with `migrate` and I'm done.

I wanted to use it in a serverless function to write in a remote Postgres instance. Django doesn't have a separate package for it's ORM, but it's still possible to use it on its own.

## Minimal boilerplate

First, I've created a `manage.py` to configure Django. It also runs the management CLI. 
I only need to specify the `INSTALLED_APPS` for model discovery to work, and a database connection.

```python
#!/usr/bin/env python

def init_django():
    import django
    from django.conf import settings

    if settings.configured:
        return

    settings.configure(
        INSTALLED_APPS=[
            'db',
        ],
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': 'myapp',
                'USER': 'myapp_user',
                'PASSWORD': 'myapp',
                'HOST': '127.0.0.1',
                'PORT': '5432',
            }
        }
    )
    django.setup()


if __name__ == "__main__":
    from django.core.management import execute_from_command_line

    init_django()
    execute_from_command_line()
```

I've created a module called `db` to act as a Django app and placed a `models.py` in it.

```python
# db/models.py
from django.db import models
from manage import init_django

init_django()

class Model(models.Model):
    id = models.AutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# define models here
class Post(Model):
    ...
```

Django needs to initialized for models to work, that's why I call `init_django()` to initialize it before defining the models. 

Here's how the final folder structure looks like:

```
.
|-- db
|   |-- __init__.py
|   `-- models.py
|-- manage.py
|-- requirements.txt
```

That's about it. Now I can build models and update the database schema:

```shell
# create a migration under `./db/migrations`
$ python manage.py makemigrations db 

# apply migrations
$ python manage.py migrate
```

To use the models, I import them directly like any other class.

```python
from db.models import Post

for it in Post.objects.all():
    print(it)
```

