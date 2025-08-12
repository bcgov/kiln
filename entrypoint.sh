#!/bin/sh

echo "🏁 Starting container with runtime build..."

# Ensure /app is group-writable
chmod -R g+w /app

# Write all VITE_* env vars dynamically to .env (use tee for permissions)
printenv | grep '^VITE_' | tee .env > /dev/null

# Build the application
echo "Building application..."
npm run build

# Start the custom server
echo "Starting custom Node.js server on port 8080..."
node server.js
