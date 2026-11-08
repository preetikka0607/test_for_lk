#!/usr/bin/env bash
set -euo pipefail

IMAGE_URI="$1"
AWS_REGION="$2"
ECR_REGISTRY="$3"

systemctl start docker

aws ecr get-login-password --region "$AWS_REGION" |
  docker login \
    --username AWS \
    --password-stdin \
    "$ECR_REGISTRY"

# Download before interrupting the existing app.
docker pull "$IMAGE_URI"

if docker container inspect vue-from-ecr >/dev/null 2>&1; then
  docker stop vue-from-ecr
  docker rm vue-from-ecr
fi

docker run -d \
  --name vue-from-ecr \
  -e PORT=3000 \
  -p 80:3000 \
  "$IMAGE_URI"

if ! curl --fail --silent --show-error \
  --retry 15 --retry-connrefused --retry-delay 2 \
  --max-time 5 http://localhost/ >/dev/null; then
  docker logs vue-from-ecr
  exit 1
fi

echo "Deployment succeeded: $IMAGE_URI"