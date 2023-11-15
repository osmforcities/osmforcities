# OSM for Cities - Website

A Next.js server for the web interface of OSM for Cities project.

## Getting started

If you are running the server locally, please start the [development PostgreSQL database](apps/postgres/README.md) first.

## Environment variables

The following environment variables are available:

```text
POSTGRES_URL='<the connection string to the PostgreSQL database'>
```

### Prerequisites

- [Node.js](https://nodejs.org) (see [.nvmrc](./.nvmrc) for the required version). To manage multiple Node versions, we recommend using [nvm](https://github.com/creationix/nvm).
- [pnpm](https://pnpm.io) for efficient and fast package management.

### Install Dependencies

If you are using [`nvm`](https://github.com/creationix/nvm), activate the desired Node version:

```sh
nvm install
```

Then, install the Node.js modules:

```sh
pnpm install
```

### Getting Started

To start the development server, run:

```sh
pnpm dev
```

After starting the server, open [http://localhost:3000](http://localhost:3000) in your browser to view the website.

## License

This project and its contents are licensed under the terms specified in the [LICENSE](../LICENSE) file located in the parent directory of this monorepo.
