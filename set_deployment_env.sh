#!/usr/bin/env bash

## This file will be used in the docker-compose.yml file automatically because of its name and location.
## So this is the place where to transfer the CI-variables to docker-compose.
echo "VUE_APP_TITLE=Overmind" >> .env
echo "VUE_APP_PROTOCOL=https" >> .env
echo "VUE_APP_ADDRESS=overmind.unterrainer.info" >> .env
echo "VUE_APP_PORT=443" >> .env
