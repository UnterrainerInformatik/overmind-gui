#!/usr/bin/env bash
. ./.gitlab-env

echo "$ echo \"$CI_DEPLOY_PASSWORD\"| docker login -u \"$CI_DEPLOY_USER\" --password-stdin \"$CI_REGISTRY_URL\""
echo "$CI_DEPLOY_PASSWORD"| docker login -u "$CI_DEPLOY_USER" --password-stdin "$CI_REGISTRY_URL"
docker-compose pull
echo $ docker-compose up -d --force-recreate --remove-orphans &
docker-compose up -d --force-recreate --remove-orphans &
