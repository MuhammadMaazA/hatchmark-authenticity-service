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
        logger.info(f"Upload initiation request received: {request.method}")
        data = request.get_json()
        logger.info(f"Request data: {data}")
        
        if not data or 'filename' not in data:
            logger.error("Missing filename in request")
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

@app.route('/uploads/complete', methods=['POST'])
def complete_upload():
    """Complete file upload and register asset"""
    try:
        logger.info("Upload completion request received")
        data = request.get_json()
        logger.info(f"Completion data: {data}")
        
        if not data or 'uploadId' not in data:
            return jsonify({'error': 'uploadId is required'}), 400
            
        upload_id = data['uploadId']
        object_key = data.get('objectKey', '')
        creator = data.get('creator', 'anonymous')
        email = data.get('email', '')
        
        if upload_id not in mock_uploads:
            return jsonify({'error': 'Upload not found'}), 404
            
        # Update upload record
        mock_uploads[upload_id].update({
            'status': 'completed',
            'creator': creator,
            'email': email,
            'completedAt': datetime.now(timezone.utc).isoformat()
        })
        
        # Generate asset ID and hash
        asset_id = f"asset_{int(time.time())}_{upload_id[:8]}"
        asset_hash = f"hash_{hash(object_key + creator) % 1000000:06d}"
        
        # Register in mock assets
        mock_assets[asset_hash] = {
            'assetId': asset_id,
            'filename': mock_uploads[upload_id]['filename'],
            'perceptualHash': asset_hash,
            'objectKey': object_key,
            'creator': creator,
            'email': email,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'status': 'verified'
        }
        
        logger.info(f"Asset registered: {asset_id}")
        
        return jsonify({
            'assetId': asset_id,
            'perceptualHash': asset_hash,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'message': 'Upload completed and asset registered'
        })
        
    except Exception as e:
        logger.error(f"Upload completion failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/verify', methods=['GET', 'POST'])
def verify_asset():
    """Verify asset authenticity"""
    try:
        if request.method == 'GET':
            # Handle search by asset ID
            asset_id = request.args.get('assetId')
            if not asset_id:
                return jsonify({'error': 'assetId parameter required'}), 400
            
            # Search in mock assets
            for asset_hash, asset in mock_assets.items():
                if asset.get('assetId') == asset_id or asset.get('filename', '').lower().find(asset_id.lower()) >= 0:
                    return jsonify({
                        'assetId': asset['assetId'],
                        'filename': asset.get('filename', 'unknown.jpg'),
                        'status': 'verified',
                        'confidence': 95,
                        'timestamp': asset['timestamp'],
                        'originalHash': asset['perceptualHash'],
                        'creator': asset.get('creator', 'anonymous')
                    })
            
            # If not found, return unknown status
            return jsonify({
                'assetId': asset_id,
                'filename': f'search-{asset_id}',
                'status': 'unknown',
                'confidence': 0,
                'timestamp': 'not_found',
                'originalHash': 'not_found',
                'creator': 'unknown'
            })
        
        elif request.method == 'POST':
            # Handle file upload verification
            if 'file' in request.files:
                # File upload verification
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                if file and file.content_type.startswith('image/'):
                    # Read file for processing
                    file_content = file.read()
                    file_size = len(file_content)
                    
                    # Mock hash generation based on file content
                    import hashlib
                    file_hash = hashlib.md5(file_content).hexdigest()[:12]
                    
                    # Check if file exists in our mock registry
                    found_asset = None
                    for asset_hash, asset in mock_assets.items():
                        if asset.get('filename') == file.filename:
                            found_asset = asset
                            break
                    
                    if found_asset:
                        # File found in registry
                        return jsonify({
                            'assetId': found_asset['assetId'],
                            'filename': file.filename,
                            'status': 'verified',
                            'confidence': 98,
                            'timestamp': found_asset['timestamp'],
                            'originalHash': found_asset['perceptualHash'],
                            'currentHash': file_hash,
                            'creator': found_asset.get('creator', 'anonymous')
                        })
                    else:
                        # File not in registry - return unknown status
                        return jsonify({
                            'assetId': 'unknown',
                            'filename': file.filename,
                            'status': 'unknown',
                            'confidence': 0,
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'originalHash': 'not_found',
                            'currentHash': file_hash,
                            'creator': 'unknown'
                        })
                else:
                    return jsonify({'error': 'Please upload an image file'}), 400
            
            else:
                # JSON verification (legacy support)
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'JSON data or file required'}), 400
                
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
    """Process asset (compute hash and add to ledger)"""
    try:
        data = request.get_json()
        if not data or 'objectKey' not in data:
            return jsonify({'error': 'objectKey is required'}), 400
        
        object_key = data['objectKey']
        
        # Download image from S3 and compute perceptual hash
        session = get_aws_session()
        if not session:
            return jsonify({'error': 'AWS session failed'}), 500
        
        s3_client = session.client('s3')
        
        try:
            # Download the image
            response = s3_client.get_object(Bucket=INGESTION_BUCKET, Key=object_key)
            image_data = response['Body'].read()
            
            # Compute perceptual hash
            import imagehash
            from PIL import Image
            import io
            
            image = Image.open(io.BytesIO(image_data))
            perceptual_hash = str(imagehash.phash(image))
            
            # Add to ledger (DynamoDB)
            import boto3
            dynamodb = session.resource('dynamodb')
            table = dynamodb.Table('hatchmark-assets')
            
            asset_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Add to DynamoDB
            table.put_item(Item={
                'assetId': asset_id,
                'perceptualHash': perceptual_hash,
                'objectKey': object_key,
                'timestamp': timestamp,
                'status': 'REGISTERED',
                'creatorId': 'demo-user'
            })
            
            # Generate processed object key
            processed_key = object_key.replace('uploads/', 'watermarked/')
            
            return jsonify({
                'success': True,
                'assetId': asset_id,
                'perceptualHash': perceptual_hash,
                'originalKey': object_key,
                'processedKey': processed_key,
                'timestamp': timestamp,
                'watermark_applied': True
            })
            
        except ClientError as e:
            logger.error(f"S3 or DynamoDB error: {e}")
            return jsonify({'error': 'Failed to process asset'}), 500
        
    except Exception as e:
        logger.error(f"Asset processing failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting Hatchmark Local Development Server...")
    print("Frontend should connect to: http://localhost:3002")
    print("Available endpoints:")
    print("  GET  /health")
    print("  POST /uploads/initiate")
    print("  POST /uploads/complete")
    print("  GET  /upload-status/<id>")
    print("  POST /verify")
    print("  GET  /ledger")
    print("  POST /ledger")
    print("  POST /process")
    
    app.run(host='0.0.0.0', port=3002, debug=True)
