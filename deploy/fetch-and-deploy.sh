#!/bin/bash

# This script deploys our app in preproduction or production
# It takes two arguments (passed by webhook service): 
#   1) tag of docker image: same as branch name, i.e. "dev" or "main"
export DOCKER_IMAGE_TAG="$1"
#   2) DockerHub user, also used for DockerHub namespace
export DOCKER_USER="$2"

echo "docker image tag: $DOCKER_IMAGE_TAG pushed by $DOCKER_USER"

# depending on docker image tag (i.e. git branch), we set environment "prod" or "preprod" and change nginx port
if [ "$DOCKER_IMAGE_TAG" == "main"  ]; then 
  export APP_ENV='prod' 
  export GATEWAY_PORT=8000 
else
  export APP_ENV='preprod' 
  export GATEWAY_PORT=8002 
fi	

COMPOSE_FILE=docker-compose.yml

# ensure last version of our docker images are used
docker compose pull

# start services with a project name of "app_prod" or "app_preprod" 
docker compose -f "$COMPOSE_FILE" -p "app_$APP_ENV" up --build --force-recreate -d 
