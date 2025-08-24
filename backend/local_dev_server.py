#!/usr/bin/env python3
"""
Local development server for Hatchmark API
This provides mock endpoints for frontend development
"""

import json
import uuid
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Mock data storage (in production this would be QLDB)
mock_ledger = {}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Hatchmark API',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/uploads/initiate', methods=['POST', 'OPTIONS'])
def generate_upload_url():
    """Generate a mock presigned URL for file upload"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'error': 'filename is required'}), 400
        
        # Generate a mock upload URL (in development, we'll simulate this)
        unique_id = str(uuid.uuid4())
        file_extension = filename.split('.')[-1] if '.' in filename else ''
        object_key = f"uploads/{unique_id}.{file_extension}" if file_extension else f"uploads/{unique_id}"
        
        # For local development, return a mock URL
        mock_upload_url = f"http://localhost:3000/mock-upload/{unique_id}"
        
        return jsonify({
            'uploadUrl': mock_upload_url,
            'objectKey': object_key,
            'uploadId': unique_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/mock-upload/<upload_id>', methods=['PUT'])
def mock_upload(upload_id):
    """Mock S3 upload endpoint for local development"""
    try:
        # In local development, we simulate file processing
        file_data = request.get_data()
        
        if not file_data:
            return jsonify({'error': 'No file data received'}), 400
        
        # Generate mock hash
        mock_hash = hashlib.md5(file_data).hexdigest()[:16]
        
        # Simulate writing to ledger
        ledger_id = str(uuid.uuid4())
        mock_ledger[ledger_id] = {
            'uploadId': upload_id,
            'hash': mock_hash,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'processed',
            'fileSize': len(file_data)
        }
        
        return '', 200  # S3 returns empty response on successful PUT
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/verify', methods=['POST', 'OPTIONS'])
def verify_artwork():
    """Verify artwork authenticity"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        file_hash = data.get('hash')
        
        if not file_hash:
            return jsonify({'error': 'hash is required'}), 400
        
        # Search mock ledger for matching hash
        for ledger_id, record in mock_ledger.items():
            if record['hash'] == file_hash:
                return jsonify({
                    'verified': True,
                    'ledgerId': ledger_id,
                    'timestamp': record['timestamp'],
                    'status': record['status']
                })
        
        return jsonify({
            'verified': False,
            'message': 'No matching record found in ledger'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload-status/<upload_id>', methods=['GET'])
def upload_status(upload_id):
    """Check upload processing status"""
    try:
        # Find the record by upload ID
        for ledger_id, record in mock_ledger.items():
            if record['uploadId'] == upload_id:
                return jsonify({
                    'status': record['status'],
                    'ledgerId': ledger_id,
                    'hash': record['hash'],
                    'timestamp': record['timestamp']
                })
        
        return jsonify({
            'status': 'not_found',
            'message': 'Upload ID not found'
        }), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ledger', methods=['GET'])
def list_ledger():
    """List all ledger entries (for development/debugging)"""
    return jsonify({
        'entries': mock_ledger,
        'count': len(mock_ledger)
    })

if __name__ == '__main__':
    print("Starting Hatchmark Local Development Server...")
    print("Frontend should connect to: http://localhost:3000")
    print("Available endpoints:")
    print("  GET  /health")
    print("  POST /uploads/initiate")
    print("  POST /verify")
    print("  GET  /upload-status/<id>")
    print("  GET  /ledger")
    
    app.run(host='0.0.0.0', port=3000, debug=True)
