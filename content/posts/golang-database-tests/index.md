---
title: "Testing database interactions in Golang"
date: 2026-10-10
taxonomies:
  tags: [golang, testing]
---

Testing is a hot topic in software development. There are probably more approaches than there are tests [^citation_xkcd]. 

Coverage is a common metric for gauging how well some piece of code is tested, but it falls apart when the lines of code are actually _not_ code: they're the SQL statements that are being executed. The language runtime can't help you gauge how well your "code" is tested. The problem is that the SQL statements are not executed by your code, but by the database engine. 

So how do you test if your query is doing what it's supposed to? By actually running it against a database.

## Preparing the database

Django offers [^django_tests] a built-in test framework that runs tests against a temporary database. It creates the database, runs the migrations, and then runs the tests. They can even be isolated within a transaction without causing bad interactions. 

There are some similar solutions in Golang, but they're all cumbersome to use because of one thing: fixtures. How do you populate the database with the right data for your tests? Django had a [factory_boy][factory_boy] library that would hook into the ORM and create the right objects with the right relations and plug in fake data. You'd be able to override a field nested inside a relation to make your test work.

```python
# pseudotest 

# this creates a person, and a related address with the city set to 'New York'.
p = PersonFactory.create(
    name="John Doe", 
    address__city="New York",
)
assert p.address.city == "New York"
```

ORMs are not welcome in Golang. The language is not really built for dynamism. People write SQL statements directly without using an ORM, so the relations are only mapped in the developer's head. We can accept this as a fact and build our harness around it. 

The [testfixtures][testfixtures] library helps with this. You write YAML files that describe which tables have which rows, and the library will insert those rows.

```yaml
persons:
  - id: 1
    name: John Doe
    address_id: 21

addresses: 
  - id: 21
    city: Berlin
    street: Boxhagenstr. 10
```

We can build a test helper that populates the database with the right data and runs the queries against it.

```go
func applyFixtures(t *testing.DB, db *sql.DB, fixturePath string) {
    t.Helper()
    fixtures, err := testfixtures.New(
        testfixtures.Database(db),
        testfixtures.Dialect("postgres"),
        testfixtures.Files(fixturePath),
    )
    require.NoError(t, err)
    
    return fixtures.Load()
}
```

## Isolating tests

This is nice and all, but it leaves the database in a dirty state. If we run multiple tests, they will interfere with each other. We need to wrap each test in a transaction and roll it back when the test ends.
The [txdb][txdb] library fits well here.

```go
import (
    ...	
    "github.com/DATA-DOG/go-txdb"
    _ "github.com/lib/pq"
)

func init() {
    // we register an SQL driver named "txdb"
    txdb.Register("txdb", "postgres", "user=postgres dbname=test sslmode=disable")
}

func newTestDB(t *testing.T) *sql.DB {
    // this is a database created from the latest seed
    realDB, err := sql.Open("postgres", "user=postgres dbname=test sslmode=disable")
    require.NoError(t, err)

    // apply the migrations to prepare it for tests
    err = migrations.Run(t.Context(), realDB)
    require.NoError(t, err)

    // use a dynamic name for the database connection to avoid conflicts
    testDB, err := sql.Open("txdb", t.Name())
    require.NoError(t, err)	

    require.NoError(t, err)

    t.Cleanup(func() {
        testDB.Close()
    })
    return testDB
}

func TestGetUserAddress(t *testing.T) {
    db := newTestDB(t)
    applyFixtures(t, db, "testdata/get_user_address.yaml")

    repo := NewRepo(db)
    
    userID := 1 // this refers to an ID in the fixture
    addr, err := repo.GetUserAddress(t.Context(), userID)
    require.NoError(t, err)

    assert.Equal(t, "Berlin", addr.City)
}
```

### Dealing with the setup overhead

This works. But migrations pose an issue. They are executed for every test. The logic in `migrations.Run` hopefully skips over applied migrations, but still, it adds overhead. We need to run it once per test run, which includes all packages being tested. 

We might reach for a `sync.Once`, but it won't work as you'd expect. Golang compiles your tests and executes them in parallel as separate processes. So the `sync.Once` will only work for a single test process, not across all of them. 

We need a global mutex to synchronize all those migrations. Postgres has our back.

```go
func lock(t *testing.T, db *sql.DB) func() {
    t.Helper()
    const lockID = 1234567890 // some unique number
    _, err := db.Exec("SELECT pg_advisory_lock($1)", lockID)
    require.NoError(t, err)

    return func() {
        _, err := db.Exec("SELECT pg_advisory_unlock($1)", lockID)
        require.NoError(t, err)
    }
}
```

`lockID` is a hardcoded random number [^xkcd_dice] that is shared across all runs. 
This removes the need for a `sync.Once` and allows us to run migrations once per test run.

```go
func migrateTestDB(*testing.T, db *sql.DB) {
    unlock := lock(t, db)
    defer unlock()

    // migrations will run once per test run.
    err := migrations.Run(t.Context(), db)
    require.NoError(t, err)
}

func newTestDB(t *testing.T) *sql.DB {
    // this is a database created from the latest seed
    realDB, err := sql.Open("postgres", "user=postgres dbname=test sslmode=disable")
    require.NoError(t, err)

    migrateTestDB(t, realDB)
    ...
}
```

## Where it falls short

This is a simplified version of what we use in production. It works well. 

However, it has some downsides. For one, the fixtures are not easy to prepare. We end up with a lot of boilerplate data in the YAML files, because real-world tables don't consist of 3-4 columns. They have tens of columns, and queries join many tables, so you have to specify the rows for all those tables.

Also, the queries are often not simple. If they have many `WHERE` clauses, it is not easy to prepare the "right" fixture that would satisfy the right combination of conditions. So you end up with huge fixtures that are difficult to maintain and reason about.

The fixtures are also not reviewable, because you can't put them next to the test code that uses them. You often end up referring to records by their IDs, which are not meaningful. The reviewer has to take the author's word for it. 


[^citation_xkcd]: https://xkcd.com/285/
[^django_tests]: Offers? _Offered_. Haven't checked it in the last four years. https://docs.djangoproject.com/en/dev/topics/testing/tools/#django.test.TransactionTestCase.fixtures
[^xkcd_dice]: https://xkcd.com/221/

[testfixtures]: https://github.com/go-testfixtures/testfixtures
[txdb]: https://github.com/DATA-DOG/go-txdb
[factory_boy]: https://factoryboy.readthedocs.io/en/stable/
