#!/usr/bin/env python3
"""
Hatchmark Local Development Server
Provides mock API endpoints for local development
"""

import os
import sys
import uuid
import json
import time
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
from botocore.exceptions import ClientError

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
INGESTION_BUCKET = "hatchmark-ingestion-bucket-36933227"
PROCESSED_BUCKET = "hatchmark-processed-bucket-36933227"
AWS_PROFILE = "hatchmark-dev"

# Mock data storage
mock_uploads = {}
mock_assets = {}

def get_aws_session():
    """Get AWS session with profile"""
    try:
        return boto3.Session(profile_name=AWS_PROFILE)
    except Exception as e:
        logger.warning(f"AWS session failed: {e}")
        return None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'hatchmark-local-dev',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0.0'
    })

@app.route('/uploads/initiate', methods=['POST'])
def initiate_upload():
    """Initiate file upload with presigned URL"""
    try:
        data = request.get_json()
        if not data or 'filename' not in data:
            return jsonify({'error': 'filename is required'}), 400
        
        filename = data['filename']
        if not filename.strip():
            return jsonify({'error': 'filename cannot be empty'}), 400
        
        # Generate unique object key
        upload_id = str(uuid.uuid4())
        object_key = f"uploads/{upload_id}/{filename}"
        
        # Try to generate real presigned URL if AWS is available
        session = get_aws_session()
        if session:
            try:
                s3_client = session.client('s3')
                presigned_url = s3_client.generate_presigned_url(
                    'put_object',
                    Params={
                        'Bucket': INGESTION_BUCKET,
                        'Key': object_key,
                        'ContentType': 'image/*'
                    },
                    ExpiresIn=600
                )
                
                # Store upload info
                mock_uploads[upload_id] = {
                    'uploadId': upload_id,
                    'filename': filename,
                    'objectKey': object_key,
                    'status': 'initiated',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                
                return jsonify({
                    'uploadUrl': presigned_url,
                    'objectKey': object_key,
                    'uploadId': upload_id
                })
                
            except Exception as e:
                logger.warning(f"Real S3 presigned URL failed: {e}")
        
        # Fallback to mock presigned URL
        mock_presigned_url = f"https://{INGESTION_BUCKET}.s3.eu-west-1.amazonaws.com/{object_key}?mock=true"
        
        mock_uploads[upload_id] = {
            'uploadId': upload_id,
            'filename': filename,
            'objectKey': object_key,
            'status': 'initiated',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        return jsonify({
            'uploadUrl': mock_presigned_url,
            'objectKey': object_key,
            'uploadId': upload_id
        })
        
    except Exception as e:
        logger.error(f"Upload initiation failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/upload-status/<upload_id>', methods=['GET'])
def get_upload_status(upload_id):
    """Get upload status"""
    if upload_id not in mock_uploads:
        return jsonify({'error': 'Upload not found'}), 404
    
    return jsonify(mock_uploads[upload_id])

@app.route('/verify', methods=['POST'])
def verify_asset():
    """Verify asset authenticity"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Handle different verification methods
        if 'hash' in data:
            # Verify by hash
            asset_hash = data['hash']
            
            # Mock verification logic
            if asset_hash in mock_assets:
                asset = mock_assets[asset_hash]
                return jsonify({
                    'verified': True,
                    'asset': asset,
                    'verification_time': datetime.now(timezone.utc).isoformat()
                })
            else:
                return jsonify({
                    'verified': False,
                    'message': 'Asset not found in registry',
                    'verification_time': datetime.now(timezone.utc).isoformat()
                })
        
        elif 'objectKey' in data:
            # Verify by object key
            object_key = data['objectKey']
            
            # Generate mock hash for demonstration
            mock_hash = f"hash_{hash(object_key) % 1000000:06d}"
            
            # Create mock asset record
            asset_id = str(uuid.uuid4())
            asset_record = {
                'assetId': asset_id,
                'perceptualHash': mock_hash,
                'objectKey': object_key,
                'status': 'verified',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'metadata': {
                    'source': 'local_dev',
                    'verification_method': 'object_key'
                }
            }
            
            # Store in mock registry
            mock_assets[mock_hash] = asset_record
            
            return jsonify({
                'verified': True,
                'asset': asset_record,
                'verification_time': datetime.now(timezone.utc).isoformat()
            })
        
        else:
            return jsonify({'error': 'hash or objectKey required'}), 400
            
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/ledger', methods=['GET'])
def get_ledger():
    """Get ledger entries"""
    return jsonify({
        'assets': list(mock_assets.values()),
        'total_count': len(mock_assets),
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

@app.route('/ledger', methods=['POST'])
def add_to_ledger():
    """Add entry to ledger"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Generate asset ID
        asset_id = str(uuid.uuid4())
        
        # Create asset record
        asset_record = {
            'assetId': asset_id,
            'perceptualHash': data.get('perceptualHash', ''),
            'objectKey': data.get('objectKey', ''),
            'creatorId': data.get('creatorId', 'anonymous'),
            'status': 'registered',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'metadata': data.get('metadata', {})
        }
        
        # Store in mock registry
        if asset_record['perceptualHash']:
            mock_assets[asset_record['perceptualHash']] = asset_record
        
        return jsonify({
            'success': True,
            'assetId': asset_id,
            'documentId': asset_id,  # For compatibility
            'asset': asset_record
        })
        
    except Exception as e:
        logger.error(f"Ledger entry failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/process', methods=['POST'])
def process_asset():
    """Process asset (mock watermarking)"""
    try:
        data = request.get_json()
        if not data or 'objectKey' not in data:
            return jsonify({'error': 'objectKey is required'}), 400
        
        object_key = data['objectKey']
        
        # Simulate processing time
        time.sleep(1)
        
        # Generate processed object key
        processed_key = object_key.replace('uploads/', 'watermarked/')
        
        return jsonify({
            'success': True,
            'originalKey': object_key,
            'processedKey': processed_key,
            'processing_time': datetime.now(timezone.utc).isoformat(),
            'watermark_applied': True
        })
        
    except Exception as e:
        logger.error(f"Asset processing failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting Hatchmark Local Development Server...")
    print("Frontend should connect to: http://localhost:3002")
    print("Available endpoints:")
    print("  GET  /health")
    print("  POST /uploads/initiate")
    print("  GET  /upload-status/<id>")
    print("  POST /verify")
    print("  GET  /ledger")
    print("  POST /ledger")
    print("  POST /process")
    
    app.run(host='0.0.0.0', port=3002, debug=True)
