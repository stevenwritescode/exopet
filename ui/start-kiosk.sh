#!/bin/bash

# Exopet UI Kiosk Startup Script
# Launched by exopet-kiosk.service on boot

export DISPLAY=:0
export NODE_ENV=production

cd /home/exopet/exopet/ui

# Start the React dev server in the background
npm run react-start &
REACT_PID=$!

# Wait for the React dev server to be available
echo "Waiting for React dev server on port 3000..."
while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
  sleep 1
done
echo "React dev server is up."

# Launch Electron in kiosk mode
npm run electron

# If Electron exits, clean up the React server
kill $REACT_PID 2>/dev/null
