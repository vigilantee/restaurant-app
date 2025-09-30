#!/bin/bash

# Restaurant Electron App Setup Script
# For Unix/Linux/macOS

set -e

echo "=========================================="
echo "Restaurant Electron App Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}Node.js version: $(node -v)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}npm version: $(npm -v)${NC}"

# Check if PostgreSQL is installed
echo ""
echo "Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}Warning: PostgreSQL is not found in PATH${NC}"
    echo "Please ensure PostgreSQL is installed and running"
    echo "Download from: https://www.postgresql.org/download/"
else
    echo -e "${GREEN}PostgreSQL is installed${NC}"
fi

# Install root dependencies
echo ""
echo "Installing root dependencies..."
npm install

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install

# Build React app
echo ""
echo "Building React application..."
npm run build

# Go back to root
cd ..

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd app
npm install
cd ..

# Create .env file if it doesn't exist
echo ""
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file with your PostgreSQL credentials${NC}"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

# Create database
echo ""
echo -e "${YELLOW}Database Setup${NC}"
echo "Please ensure PostgreSQL is running and create the database:"
echo ""
echo "  createdb myapp"
echo ""
echo "Or using psql:"
echo "  psql -U postgres"
echo "  CREATE DATABASE myapp;"
echo "  \\q"
echo ""

echo "=========================================="
echo -e "${GREEN}Setup completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Create PostgreSQL database: createdb myapp"
echo "3. Run the application: npm start"
echo ""