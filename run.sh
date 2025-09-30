#!/bin/bash

# python venv 

ENV_DIR=".env"

if [ ! -d "$ENV_DIR" ]
then
    echo "creating python venv in $ENV_DIR..."
    python3 -m venv "$ENV_DIR"
fi
source .env/bin/activate

# system dependencies

if ! command -v mlr &> /dev/null
then
    sudo apt-get update && sudo apt-get install -y miller
fi

# python dependencies (not yet)

# pip install --upgrade pip
# if [ -f "requirements.txt" ]
    # then
    # pip install -r requirements.txt
# fi

# download articles and create json databases

bash src/datasets/scrapper.sh
python3 src/datasets/gen_db.py
