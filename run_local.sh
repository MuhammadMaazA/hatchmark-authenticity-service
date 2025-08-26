#!/bin/bash

# Hatchmark Local Development Server Script
# This script starts both the backend API and frontend development servers

echo "Starting Hatchmark Digital Authenticity Service..."
echo "=================================================="

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
if [ -f ".venv/Scripts/activate" ]; then
    # Windows
    source .venv/Scripts/activate
else
    # Linux/Mac
    source .venv/bin/activate
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend/src
pip install -r requirements.txt
cd ../..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create terminal sessions for backend and frontend
echo ""
echo "Starting services..."
echo "Backend API will run on: http://localhost:3002"
echo "Frontend will run on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"

# Start backend in background
cd backend
python local_dev_server.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend in background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Keep script running
wait
