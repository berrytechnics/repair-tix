#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Circuit Sage - Deployment Script"
echo "========================================="

# Check if running from project root
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo -e "${YELLOW}Please copy deployment/hetzner/env.production.example to .env.production and configure it.${NC}"
    exit 1
fi

# Load environment variables
set -a
source .env.production
set +a

# Validate required variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "ENCRYPTION_KEY" "ALLOWED_ORIGINS" "NEXT_PUBLIC_API_URL" "DOMAIN_NAME")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo -e "${GREEN}Step 1: Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

echo -e "${GREEN}Step 2: Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production down || true

echo -e "${GREEN}Step 3: Starting database first...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres

# Wait for database to be healthy
echo -e "${GREEN}Waiting for database to be ready...${NC}"
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_isready -U "${POSTGRES_USER:-circuit_sage_user}" -d "${POSTGRES_DB:-circuit_sage_db}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
    sleep 1
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${RED}Error: Database failed to become ready after ${MAX_WAIT} seconds${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs postgres
    exit 1
fi

echo -e "${GREEN}Step 4: Running database migrations...${NC}"
# Start backend temporarily to run migrations
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend

# Wait for backend to start
sleep 5

# Run migrations explicitly
echo -e "${GREEN}Running migrations...${NC}"
MIGRATION_ATTEMPTS=0
MAX_MIGRATION_ATTEMPTS=5
MIGRATION_SUCCESS=false

while [ $MIGRATION_ATTEMPTS -lt $MAX_MIGRATION_ATTEMPTS ]; do
    if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend yarn migrate:prod; then
        MIGRATION_SUCCESS=true
        echo -e "${GREEN}✓ Migrations completed successfully${NC}"
        break
    else
        MIGRATION_ATTEMPTS=$((MIGRATION_ATTEMPTS + 1))
        echo -e "${YELLOW}Migration attempt ${MIGRATION_ATTEMPTS} failed, retrying...${NC}"
        sleep 3
    fi
done

if [ "$MIGRATION_SUCCESS" = false ]; then
    echo -e "${RED}Error: Migrations failed after ${MAX_MIGRATION_ATTEMPTS} attempts${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs backend
    exit 1
fi

echo -e "${GREEN}Step 5: Starting all services...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo -e "${GREEN}Step 6: Waiting for services to be healthy...${NC}"
sleep 15

# Check if containers are running
if ! docker compose -f docker-compose.prod.yml --env-file .env.production ps | grep -q "Up"; then
    echo -e "${RED}Error: Some containers failed to start${NC}"
    echo -e "${YELLOW}Checking logs...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs
    exit 1
fi

echo -e "${GREEN}Step 7: Setting up Nginx configuration...${NC}"
# Copy nginx config
sudo cp deployment/hetzner/nginx.conf /etc/nginx/sites-available/circuit-sage

# Replace domain placeholder
sudo sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/circuit-sage

# Enable site
sudo ln -sf /etc/nginx/sites-available/circuit-sage /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
if ! sudo nginx -t; then
    echo -e "${RED}Error: Nginx configuration test failed${NC}"
    exit 1
fi

echo -e "${GREEN}Step 8: Setting up SSL certificate...${NC}"
# Stop nginx temporarily for certbot
sudo systemctl stop nginx || true

# Obtain certificate
sudo certbot certonly --standalone \
    --preferred-challenges http \
    -d "$DOMAIN_NAME" \
    --email "${SSL_EMAIL:-admin@$DOMAIN_NAME}" \
    --agree-tos \
    --non-interactive || {
    echo -e "${YELLOW}Warning: SSL certificate setup failed. You may need to set up DNS first.${NC}"
    echo -e "${YELLOW}Continuing without SSL for now...${NC}"
}

# Update nginx config with SSL - use certbot nginx plugin for automatic configuration
if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
    echo -e "${GREEN}Configuring HTTPS in Nginx...${NC}"
    
    # Use certbot's nginx plugin to automatically configure SSL
    # This is more reliable than manual sed edits
    sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "${SSL_EMAIL:-admin@$DOMAIN_NAME}" --redirect || {
        echo -e "${YELLOW}Certbot nginx plugin failed, trying manual configuration...${NC}"
        
        # Fallback: Manual configuration using sed
        sudo cp deployment/hetzner/nginx.conf /etc/nginx/sites-available/circuit-sage
        sudo sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/circuit-sage
        
        # Uncomment HTTPS server block (remove # from lines 73-147)
        sudo sed -i '73,147s/^#//' /etc/nginx/sites-available/circuit-sage
        
        # Comment out HTTP proxy locations and add redirects
        sudo sed -i '32,46s/^    \(location\|proxy\|limit_req\)/    # \1/' /etc/nginx/sites-available/circuit-sage
        sudo sed -i '48,61s/^    \(location\|proxy\|limit_req\)/    # \1/' /etc/nginx/sites-available/circuit-sage
        
        # Add redirects before the commented locations
        sudo sed -i '31a\    location / {\n        return 301 https://$server_name$request_uri;\n    }' /etc/nginx/sites-available/circuit-sage
        sudo sed -i '47a\    location /api {\n        return 301 https://$server_name$request_uri;\n    }' /etc/nginx/sites-available/circuit-sage
        
        # Test configuration
        if ! sudo nginx -t; then
            echo -e "${YELLOW}Warning: Nginx config test failed after SSL setup.${NC}"
            echo -e "${YELLOW}You may need to manually configure SSL in /etc/nginx/sites-available/circuit-sage${NC}"
        fi
    }
    
    echo -e "${GREEN}✓ SSL configuration completed${NC}"
else
    echo -e "${YELLOW}SSL certificate not found. Using HTTP only for now.${NC}"
    echo -e "${YELLOW}You can set up SSL later by running:${NC}"
    echo -e "${YELLOW}  sudo certbot certonly --standalone -d $DOMAIN_NAME${NC}"
    echo -e "${YELLOW}  Then run this deploy script again, or use: sudo certbot --nginx -d $DOMAIN_NAME${NC}"
fi

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo -e "${GREEN}Step 9: Setting up SSL certificate auto-renewal...${NC}"
# Add cron job for certificate renewal
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo -e "${GREEN}Step 10: Checking service health...${NC}"
sleep 10

# Check backend health with retries
BACKEND_HEALTHY=false
for i in {1..10}; do
    if curl -f -s http://localhost:4000/health > /dev/null 2>&1; then
        BACKEND_HEALTHY=true
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "$BACKEND_HEALTHY" = false ]; then
    echo -e "${YELLOW}⚠ Backend health check failed${NC}"
    echo -e "${YELLOW}Checking backend logs...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50 backend
fi

# Check frontend with retries
FRONTEND_HEALTHY=false
for i in {1..10}; do
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_HEALTHY=true
        echo -e "${GREEN}✓ Frontend is responding${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "$FRONTEND_HEALTHY" = false ]; then
    echo -e "${YELLOW}⚠ Frontend check failed${NC}"
    echo -e "${YELLOW}Checking frontend logs...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50 frontend
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Services are running:"
echo "  - Frontend: http://$DOMAIN_NAME (or http://$(hostname -I | awk '{print $1}'))"
echo "  - Backend API: http://$DOMAIN_NAME/api"
echo ""
echo "To view logs:"
echo "  docker compose -f docker-compose.prod.yml --env-file .env.production logs -f"
echo ""
echo "To stop services:"
echo "  docker compose -f docker-compose.prod.yml --env-file .env.production down"
echo ""
echo -e "${YELLOW}Important: Remove default admin credentials after first login!${NC}"

