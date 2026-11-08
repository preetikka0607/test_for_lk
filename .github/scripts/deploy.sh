#!/usr/bin/env bash
set -euo pipefail

IMAGE_URI="$1"
AWS_REGION="$2"
ECR_REGISTRY="$3"

echo "Starting Docker..."
systemctl start docker

echo "Logging Docker into ECR..."
aws ecr get-login-password --region "$AWS_REGION" |
  docker login \
    --username AWS \
    --password-stdin \
    "$ECR_REGISTRY"

echo "Pulling image: $IMAGE_URI"
docker pull "$IMAGE_URI"

# Download succeeds before the existing container is stopped.
if docker container inspect vue-from-ecr >/dev/null 2>&1; then
  echo "Removing previous container..."
  docker stop vue-from-ecr
  docker rm vue-from-ecr
fi

echo "Starting new container..."
docker run -d \
  --name vue-from-ecr \
  -e PORT=3000 \
  -p 80:3000 \
  "$IMAGE_URI"

echo "Waiting for the app to respond..."
if ! curl --fail --silent --show-error \
  --retry 15 \
  --retry-all-errors \
  --retry-delay 2 \
  --connect-timeout 2 \
  --max-time 5 \
  --output /dev/null \
  http://127.0.0.1/; then
  echo "Startup check failed. Container logs:"
  docker logs --tail 100 vue-from-ecr
  exit 1
fi

echo "Deployment succeeded: $IMAGE_URI"