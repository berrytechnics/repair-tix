# Scripts Directory

This directory contains utility scripts for managing Circuit Sage in production and development.

## Production Scripts

### backup-db.sh

Creates a compressed database backup with automatic cleanup of old backups.

**Usage:**
```bash
./scripts/backup-db.sh [backup-dir]
```

**Features:**
- Works with Docker Compose or direct database connection
- Automatically compresses backups
- Keeps last 30 days of backups
- Validates backup success

**Example:**
```bash
./scripts/backup-db.sh ./backups
```

### restore-db.sh

Restores database from a backup file.

**Usage:**
```bash
./scripts/restore-db.sh <backup-file>
```

**Warning:** This will DELETE all current data!

**Example:**
```bash
./scripts/restore-db.sh backups/circuit-sage-backup-20250215_120000.sql.gz
```

### monitor-health.sh

Monitors the health endpoint with retries.

**Usage:**
```bash
./scripts/monitor-health.sh [api-url]
```

**Example:**
```bash
./scripts/monitor-health.sh https://yourdomain.com
```

## Load Testing Scripts

### load-test/health-check.js

Simple load test for the health check endpoint.

**Usage:**
```bash
node scripts/load-test/health-check.js [concurrent] [requests]
```

**Example:**
```bash
# Test with 10 concurrent requests, 100 total requests
node scripts/load-test/health-check.js 10 100

# Test with custom API URL
API_URL=https://yourdomain.com node scripts/load-test/health-check.js 20 200
```

**Output:**
- Total requests
- Success/failure counts
- Response time statistics (min, max, avg, p50, p95, p99)
- Error details

## Backend Scripts

See `backend/scripts/` for backend-specific scripts including:
- `seed-test-companies.ts` - Seed test data for subscription billing testing
- `remove-default-admin.ts` - Remove default admin credentials
- `run-migrations.ts` - Run database migrations

## Setting Up Automated Backups

Add to crontab for daily backups at 2 AM:

```bash
crontab -e

# Add this line:
0 2 * * * cd /opt/circuit-sage && ./scripts/backup-db.sh ./backups >> /var/log/circuit-sage-backup.log 2>&1
```

## Setting Up Health Monitoring

Add to crontab for health checks every 5 minutes:

```bash
crontab -e

# Add this line:
*/5 * * * * cd /opt/circuit-sage && ./scripts/monitor-health.sh https://yourdomain.com || echo "Health check failed" | mail -s "Circuit Sage Health Check Failed" admin@example.com
```

## Permissions

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

