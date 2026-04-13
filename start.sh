#!/bin/bash
# Start both servers for development
echo "Starting Keldan VS..."
echo "  Backend: http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""
node server/index.js &
SERVER_PID=$!
npx vite --port 5173 &
VITE_PID=$!

trap "kill $SERVER_PID $VITE_PID 2>/dev/null" EXIT INT TERM
wait
