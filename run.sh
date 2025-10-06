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

cd web/

npm install

pip install --upgrade pip
if [ -f "requirements.txt" ]
then
    pip install -r requirements.txt
fi

# download articles and create json databases

# bash src/datasets/scrapper.sh
# python3 src/datasets/gen_db.py

# launch app

uvicorn server:app --host 0.0.0.0 --port 8000 &
UVICORN_PID=$!

trap "echo 'Stopping processes...'; kill $UVICORN_PID; exit 0" SIGINT SIGTERM

npm run dev
