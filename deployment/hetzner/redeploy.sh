#! /bin/bash

cd ~/circuit-sage

git pull

cd /opt/circuit-sage

cp -r ~/circuit-sage/ ./

./deployment/hetzner/deploy.sh