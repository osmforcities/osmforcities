#!/usr/bin/env bash

IMAGE_DOCKER="docker run --rm -v ${PWD}:/mnt osm-git-history/boundary"

data_path=data

mkdir -p ${data_path}

$IMAGE_DOCKER python scripts/admin_boundaries.py \
        --iso_countries=USA \
        --data_path=${data_path}

$IMAGE_DOCKER python scripts/generate_poly.py \
        --data_path=${data_path} \
        --level_bbox=ADM0 \
        --level_bbox=ADM1