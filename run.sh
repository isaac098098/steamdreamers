#!/bin/bash

ENV_DIR=".env"

if [ ! -d "$ENV_DIR" ]
then
    echo "creating python venv in $ENV_DIR..."
    python3 -m venv "$ENV_DIR"
fi

source .env/bin/activate

# bash src/datasets/scrapper.sh
python3 src/datasets/gen_db.py
