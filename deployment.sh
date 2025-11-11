#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  CoffeeLane Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Load environment variables
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

source .env

# Check if required environment variables are set
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo "Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env"
    exit 1
fi

echo -e "${YELLOW}[1/5] Checking Supabase connection...${NC}"
# Test Supabase connection
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${VITE_SUPABASE_URL}/rest/v1/" \
    -H "apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    -H "Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✓ Supabase connection successful (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}✗ Supabase connection failed (HTTP $HTTP_STATUS)${NC}"
    echo -e "${YELLOW}Warning: Continuing deployment, but Supabase may not be accessible${NC}"
fi
echo ""

echo -e "${YELLOW}[2/5] Stopping existing container...${NC}"
# Stop and remove existing container if running
if [ "$(docker ps -q -f name=coffeelane-app)" ]; then
    docker stop coffeelane-app
    echo -e "${GREEN}✓ Stopped existing container${NC}"
fi

if [ "$(docker ps -aq -f name=coffeelane-app)" ]; then
    docker rm coffeelane-app
    echo -e "${GREEN}✓ Removed existing container${NC}"
fi
echo ""

echo -e "${YELLOW}[3/5] Building Docker image...${NC}"
docker build -t coffeelane-app:latest .
echo -e "${GREEN}✓ Docker image built successfully${NC}"
echo ""

echo -e "${YELLOW}[4/5] Starting container on port 3004...${NC}"
docker run -d \
    --name coffeelane-app \
    -p 3004:80 \
    --env-file .env \
    --restart unless-stopped \
    coffeelane-app:latest

echo -e "${GREEN}✓ Container started${NC}"
echo ""

echo -e "${YELLOW}[5/5] Waiting for application to be ready...${NC}"
# Wait for the container to be healthy
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:3004/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Application is healthy and ready${NC}"
        break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo -e "${RED}✗ Application failed to start within expected time${NC}"
        echo "Check logs with: docker logs coffeelane-app"
        exit 1
    fi

    echo -n "."
    sleep 1
done
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Application is running at: ${GREEN}http://localhost:3004${NC}"
echo ""
echo "Useful commands:"
echo "  - View logs:        docker logs -f coffeelane-app"
echo "  - Stop container:   docker stop coffeelane-app"
echo "  - Start container:  docker start coffeelane-app"
echo "  - Remove container: docker rm -f coffeelane-app"
echo ""
