# Development Postgres

This directory holds the docker-compose file to start the development PostgreSQL
database, required by other applications in this monorepo.

Install [Docker](www.docker.com) and run:

```sh
docker-compose up -d
```

This will start the database as a service, with connection string:

```text
postgres://postgres:docker@localhost:5433/postgres
```
