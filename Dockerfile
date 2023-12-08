# The main purpose of this Dockerfile is to provide an contained environment
# for running the OSM4Cities CLI. It is not intended to be used for
# web development or production.

FROM node:18-bullseye-slim

RUN apt-get update && \
  apt-get install -y curl git osmium-tool unzip

ENV APP_DIR=/osmforcities

COPY . $APP_DIR/

WORKDIR $APP_DIR/apps/cli

RUN yarn install

VOLUME $APP_DIR/apps/cli/app-data

CMD ["yarn", "cli", "--help"]