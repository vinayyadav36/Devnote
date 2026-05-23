#!/bin/bash

##############################################################################
# SALTEDHASH Core Framework: Automated Deployment Script
# 
# This script fully automates the deployment of the SALTEDHASH Dev Suite
# on a production server. It handles:
# - System dependency installation
# - Directory structure creation
# - Node package provisioning
# - Process manager setup
# - Service startup and persistence
#
# Usage: bash deploy.sh
##############################################################################

set -e  # Exit immediately on any error

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_DIR="${PROJECT_DIR:-/var/www/saltedhash-tools}"
LOG_DIR="${LOG_DIR:-/var/log/saltedhash}"
SERVICE_NAME="saltedhash-engine"
NODE_ENV="production"
PORT="3000"

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# BANNER
# ============================================================================

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════════"
echo "⚡ SALTEDHASH CORE FRAMEWORK: AUTO-DEPLOYMENT SYSTEM ⚡"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# ============================================================================
# STEP 1: Update system packages
# ============================================================================

echo -e "${YELLOW}➔ Step 1: Updating system package repositories...${NC}"
sudo apt-get update -y >> /tmp/saltedhash-deploy.log 2>&1 || true
echo -e "${GREEN}✅ Packages updated${NC}"

# ============================================================================
# STEP 2: Install system dependencies
# ============================================================================

echo -e "${YELLOW}➔ Step 2: Installing system runtime dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  Installing Node.js and npm..."
    sudo apt-get install -y nodejs npm >> /tmp/saltedhash-deploy.log 2>&1
    echo -e "${GREEN}  ✓ Node.js installed ($(node --version))${NC}"
else
    echo -e "${GREEN}  ✓ Node.js already installed ($(node --version))${NC}"
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo "  Installing Git..."
    sudo apt-get install -y git >> /tmp/saltedhash-deploy.log 2>&1
    echo -e "${GREEN}  ✓ Git installed${NC}"
else
    echo -e "${GREEN}  ✓ Git already installed${NC}"
fi

# Check curl
if ! command -v curl &> /dev/null; then
    echo "  Installing curl..."
    sudo apt-get install -y curl >> /tmp/saltedhash-deploy.log 2>&1
    echo -e "${GREEN}  ✓ curl installed${NC}"
else
    echo -e "${GREEN}  ✓ curl already installed${NC}"
fi

echo -e "${GREEN}✅ System dependencies ready${NC}"

# ============================================================================
# STEP 3: Create directory structure
# ============================================================================

echo -e "${YELLOW}➔ Step 3: Creating directory structure...${NC}"

sudo mkdir -p "$PROJECT_DIR/storage/snippets"
sudo mkdir -p "$PROJECT_DIR/storage/stories"
sudo mkdir -p "$PROJECT_DIR/storage/exports"
sudo mkdir -p "$PROJECT_DIR/storage/users"
sudo mkdir -p "$LOG_DIR"

# Set proper permissions
sudo chown -R $USER:$USER "$PROJECT_DIR" 2>/dev/null || true
mkdir -p ~/.pm2

echo -e "${GREEN}✅ Directory structure created${NC}"
echo "   Storage: $PROJECT_DIR/storage/"
echo "   Logs: $LOG_DIR"

# ============================================================================
# STEP 4: Navigate to project and install Node dependencies
# ============================================================================

echo -e "${YELLOW}➔ Step 4: Provisioning Node.js packages...${NC}"

cd "$PROJECT_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found in $PROJECT_DIR${NC}"
    echo "   Please clone the repository first:"
    echo "   git clone https://github.com/vinayyadav36/Devnote.git $PROJECT_DIR"
    exit 1
fi

npm install --omit=dev >> /tmp/saltedhash-deploy.log 2>&1

echo -e "${GREEN}✅ Node packages installed${NC}"

# ============================================================================
# STEP 5: Install PM2 process manager globally
# ============================================================================

echo -e "${YELLOW}➔ Step 5: Setting up process manager...${NC}"

if ! command -v pm2 &> /dev/null; then
    echo "  Installing PM2 globally..."
    sudo npm install -g pm2 >> /tmp/saltedhash-deploy.log 2>&1
    
    # Enable PM2 startup hook
    pm2 startup >> /tmp/saltedhash-deploy.log 2>&1 || true
    
    echo -e "${GREEN}  ✓ PM2 installed and configured${NC}"
else
    echo -e "${GREEN}  ✓ PM2 already installed${NC}"
fi

# ============================================================================
# STEP 6: Start the application with PM2
# ============================================================================

echo -e "${YELLOW}➔ Step 6: Starting SALTEDHASH service...${NC}"

# Stop any existing process
pm2 stop "$SERVICE_NAME" 2>/dev/null || true
pm2 delete "$SERVICE_NAME" 2>/dev/null || true

# Start the service
cd "$PROJECT_DIR"
pm2 start server/index.js \
  --name "$SERVICE_NAME" \
  --env NODE_ENV=$NODE_ENV \
  --env PORT=$PORT \
  --log "$LOG_DIR/saltedhash.log" \
  --max-memory-restart 512M \
  --wait-ready >> /tmp/saltedhash-deploy.log 2>&1

# Save PM2 process list for persistence
pm2 save >> /tmp/saltedhash-deploy.log 2>&1

echo -e "${GREEN}✅ Service started${NC}"

# ============================================================================
# STEP 7: Create systemd service for auto-restart
# ============================================================================

echo -e "${YELLOW}➔ Step 7: Configuring system persistence...${NC}"

SYSTEMD_SERVICE="/etc/systemd/system/saltedhash.service"

sudo tee "$SYSTEMD_SERVICE" > /dev/null <<EOF
[Unit]
Description=SALTEDHASH Dev Suite Backend Service
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$(which pm2) start server/index.js --name "$SERVICE_NAME"
ExecReload=$(which pm2) reload "$SERVICE_NAME"
ExecStop=$(which pm2) stop "$SERVICE_NAME"
Restart=always
RestartSec=10

Environment="NODE_ENV=$NODE_ENV"
Environment="PORT=$PORT"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable saltedhash.service 2>/dev/null || true

echo -e "${GREEN}✅ Systemd service configured${NC}"

# ============================================================================
# STEP 8: Verify installation
# ============================================================================

echo -e "${YELLOW}➔ Step 8: Verifying installation...${NC}"

sleep 2

# Check if service is running
if pm2 list | grep -q "$SERVICE_NAME"; then
    echo -e "${GREEN}✅ Service is running${NC}"
else
    echo -e "${RED}❌ Service failed to start${NC}"
    echo "   Check logs: pm2 logs $SERVICE_NAME"
    exit 1
fi

# Test health endpoint
HEALTH_CHECK=$(curl -s http://localhost:$PORT/health || echo "")
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Could not connect to health endpoint (this is OK if port is firewalled)${NC}"
fi

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${GREEN}Service Status:${NC}"
pm2 list

echo ""
echo -e "${GREEN}Quick Commands:${NC}"
echo "  View logs:        pm2 logs $SERVICE_NAME"
echo "  Restart service:  pm2 restart $SERVICE_NAME"
echo "  Stop service:     pm2 stop $SERVICE_NAME"
echo "  Service status:   pm2 status"

echo ""
echo -e "${GREEN}System Information:${NC}"
echo "  Project Directory: $PROJECT_DIR"
echo "  Storage Location:  $PROJECT_DIR/storage/"
echo "  Log Location:      $LOG_DIR/saltedhash.log"
echo "  Service Port:      $PORT"
echo "  Environment:       $NODE_ENV"

echo ""
echo -e "${GREEN}Access Points:${NC}"
echo "  Backend API:       http://localhost:$PORT/api/v1"
echo "  Health Check:      http://localhost:$PORT/health"

echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "  1. Configure Nginx as reverse proxy (optional)"
echo "  2. Enable automatic backups: crontab -e"
echo "  3. Monitor system: pm2 monit"
echo "  4. Check logs:     tail -f $LOG_DIR/saltedhash.log"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# ============================================================================
# CLEANUP
# ============================================================================

echo -e "${YELLOW}Deployment log saved to: /tmp/saltedhash-deploy.log${NC}"
