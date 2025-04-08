#!/bin/bash
# Script to run migrations in the correct environment

# Check if Docker is running and the container exists
if docker ps | grep -q repair-api; then
  echo "Running migrations inside Docker container..."
  docker exec repair-api npx sequelize-cli db:migrate
else
  echo "Running migrations locally..."
  cd backend
  npx sequelize-cli db:migrate
fi