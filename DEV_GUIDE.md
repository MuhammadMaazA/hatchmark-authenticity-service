# Development Server Quick Start

## Start Both Servers Together

### Option 1: Using the startup script (Recommended)
```bash
./start-dev.sh
```

### Option 2: Manual start
```bash
# Terminal 1 - Backend
cd backend
python local_dev_server.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Stop All Servers
```bash
./stop-dev.sh
```

## Access Points
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3002
- **Health Check**: http://localhost:3002/health

## Available Scripts
- `./start-dev.sh` - Start both backend and frontend servers
- `./stop-dev.sh` - Stop all development servers

## Features
✅ Real AWS S3 integration 
✅ Live certificate generation  
✅ Dual-mode verification (search + upload)  
✅ Professional UI with drag-and-drop upload  
✅ Real-time error handling  

## Troubleshooting
If you get "port already in use" errors:
```bash
./stop-dev.sh
./start-dev.sh
```

## API Endpoints
- `GET /health` - Server health check
- `POST /uploads/initiate` - Start file upload
- `POST /verify` - Verify uploaded image
- `GET /verify?assetId=<id>` - Search by Asset ID
- `GET /ledger` - View all registered assets
- `POST /ledger` - Register new asset
