# OSM for Cities

A platform for distributing OpenStreetMap data presets for cities.

## Requirements

- [Osmium Tool](https://osmcode.org/osmium-tool/) (v1.14.0)
- [Node](http://nodejs.org/) (see [.nvmrc](./.nvmrc)) (To manage multiple node versions we recommend [nvm](https://github.com/creationix/nvm))
- [pnpm](https://pnpm.io/) package manager
- [Docker](https://www.docker.com/) (Optional, for development)

## Getting started

Essential steps to run the platform locally for development purposes

### Initialize .env

When running the platform for the first time, create a `.env` based on [.env.example](.env.example):

```sh
cp .env.example .env
```

### PostgreSQL database

Start the `db` docker instance in background:

```sh
docker-compose up db -d
```

To inspect the target data folder, PostgreSQL version and other settings, please check the [docker-compose.yml] file.

### Node.js version

Ensure the platform is running on the correct Node.js version:

```sh
nvm i
```

This will install and select the version included in [.nvmrc](.nvmrc) file.

### Install npm modules

This project uses a monorepo approach. To install module dependencies for the packages, run:

```sh
pnpm i
```

### Initialize Prisma

Generate [Prisma](https://www.prisma.io/) client:

```sh
pnpm prisma:generate
```

### Migrate the database

```sh
pnpm prisma:migrate
```

### Initialize data files

The following command will download and expand the required data files:

```sh
pnpm init:data
```

### Init `.env` file

Copy `.env.example` to `.env`. The example file contains some of the environment variables that can be set to configure the platform.

### Start the git server

```sh
docker-compose up
```

This command will start a Gitea server and mount data volumes to the directory `./app-data` on your local filesystem.

### Setup Gitea

1. Access the server at <http://localhost:3000>, create an user name `runner` that will be used for updating the git repositories. Save its password on your password manager as it won't be possible to reset it on a development environment.

2. [Generate an access token](http://localhost:3000/user/settings/applications) with `write:org` and `delete_repo` scope.

3. Copy token to `GITEA_ACCESS_TOKEN` environment variable in `.env` file

### Setup command line runner

Activate required Node version, if nvm is installed:

```sh
nvm install
```

Install Node modules:

```sh
yarn
```

Initialize history file:

```sh
yarn cli init-history
```

This command will download the full planet history and perform a geographic extract for the area covered by osmforcities defined in [config/coverage.poly](config/coverage.poly).

Initialize remote git repository:

```sh
yarn cli context cities-of-brazil setup
```

### Generate data

The following command will apply all the daily diff files available at [Planet OSM](https://planet.osm.org/replication/day/). This is necessary because the full history file is always outdated by some days.

```sh
yarn cli update-history --recursive
```

At this point you should have the full history available locally for processing. Now run the following to extract and publish data to the git repository:

```sh
yarn cli context cities-of-brazil update --recursive
```

## License

[MIT](LICENSE)

## Build docker image

To create the Docker images and publish them to the Docker registry, we will utilize Charpress.

```sh
pip install chartpress
docker login
chartpress --push
```

Copy the docker images tag version into your config `osm-for-cities/values.yaml` file.

## Install application charts

Once you have access to your kubernetes cluster, you can install Gitea and Runner applications using helm. Make sure that you have the correct configuration in `osm-for-cities/values.develop.yaml` or `osm-for-cities/values.production.yaml` file.

## Helm install Staging

```sh
# namespace for staging will be default
# Install
helm install staging ./osm-for-cities -f ./osm-for-cities/values.staging.yaml
# Upgrade
helm upgrade staging ./osm-for-cities -f ./osm-for-cities/values.staging.yaml
# Delete
helm delete staging
```

## Helm install production

```sh
kubectl create namespace production
# Install
helm install prod ./osm-for-cities -f ./osm-for-cities/values.production.yaml  --namespace production
# Upgrade
helm upgrade prod ./osm-for-cities -f ./osm-for-cities/values.production.yaml  --namespace production
# Delete
helm delete prod -n production
```
