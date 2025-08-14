#!/bin/bash

echo "🚀 Starting CryptoHeir Web Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Configuration not found!"
    echo "   Please create .env file with your Alchemy API key"
    echo "   You can copy from .env.example"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Get PORT from .env file
if [ -f ".env" ]; then
    PORT=$(grep "^PORT=" .env | cut -d '=' -f2)
    PORT=${PORT:-3001}  # Default to 3001 if not found
else
    PORT=3001
fi

# Start the integrated web server
echo "✅ Starting integrated web server..."
echo "🌐 Frontend + API will be available at: http://localhost:$PORT"
echo ""
npm start