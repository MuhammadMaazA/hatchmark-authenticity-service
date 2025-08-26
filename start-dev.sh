#!/bin/bash

# Hatchmark Development Server Startup Script
echo " Starting Hatchmark Development Servers..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "local_dev_server" 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Function to start backend
start_backend() {
    echo " Starting Backend Server (Python Flask)..."
    cd backend
    python local_dev_server.py &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo " Starting Frontend Server (Vite + React)..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
}

# Start backend first
start_backend

# Wait for backend to start
echo " Waiting for backend to initialize..."
sleep 3

# Start frontend
start_frontend

# Wait for frontend to start
echo " Waiting for frontend to initialize..."
sleep 3

echo ""
echo " Development servers started!"
echo ""
echo " Backend API:  http://localhost:3002"
echo " Frontend:     http://localhost:8080 (or 8081 if 8080 is busy)"
echo ""
echo " Backend Endpoints:"
echo "   GET  /health"
echo "   POST /uploads/initiate"
echo "   POST /verify"
echo "   GET  /verify"
echo "   GET  /ledger"
echo "   POST /ledger"
echo ""
echo "  To stop both servers: Ctrl+C or run: ./stop-dev.sh"
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo " Shutting down development servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "local_dev_server" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    echo " Cleanup complete!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running and show logs
echo " Monitoring servers... (Press Ctrl+C to stop)"
echo "───────────────────────────────────────────────"

# Wait for user to stop
wait
