# The main purpose of this Dockerfile is to provide an contained environment
# for running the CLI.

FROM --platform=linux/amd64 node:18-bullseye-slim

RUN apt-get update && \
  apt-get install -y curl git osmium-tool unzip openssh-client && \
  rm -rf /var/lib/apt/lists/*

ENV APP_DIR=/osmforcities
WORKDIR $APP_DIR

# Required files for installing dependencies
COPY apps/cli/package.json apps/cli/yarn.lock $APP_DIR/apps/cli/
COPY apps/cli/postinstall.js $APP_DIR/apps/cli/
COPY apps/web/prisma/. $APP_DIR/apps/web/prisma/
COPY setup-env.js $APP_DIR/

# Install dependencies
WORKDIR $APP_DIR/apps/cli
RUN yarn install

# Copy the rest of the application code
COPY . $APP_DIR/

# Volume to store CLI app data
VOLUME $APP_DIR/apps/cli/app-data

# Default command
CMD ["yarn", "cli", "--help"]
