"""
Lambda function to verify artwork authenticity.
Part of the Hatchmark Digital Authenticity Service.
"""

import boto3
import json
import os
import io
import base64
import logging
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError
from PIL import Image
import imagehash

# Initialize powertools logger
logger = Logger()

# Environment variables
LEDGER_NAME = os.environ.get('QLDB_LEDGER_NAME', 'hatchmark-ledger')
PROCESSED_BUCKET = os.environ.get('PROCESSED_BUCKET')

# Initialize clients
s3_client = boto3.client('s3')

@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    AWS Lambda handler for verifying artwork authenticity.
    
    Expected input:
    {
        "body": base64-encoded-image-data,
        "headers": {
            "content-type": "image/jpeg"
        }
    }
    
    OR for multipart form data:
    {
        "body": "multipart-form-data",
        "isBase64Encoded": true,
        "headers": {
            "content-type": "multipart/form-data; boundary=..."
        }
    }
    
    Returns:
    {
        "verdict": "VERIFIED" | "POTENTIALLY_ALTERED" | "NOT_REGISTERED",
        "confidence": 0.95,
        "details": {
            "watermarkFound": true,
            "hashMatch": true,
            "registrationDate": "2025-08-23T00:00:00Z",
            "documentId": "..."
        }
    }
    """
    
    try:
        logger.info("Processing verification request")
        
        # Parse the uploaded image
        image = _extract_image_from_event(event)
        if not image:
            return _error_response(400, "No valid image found in request")
        
        logger.info(f"Image extracted: {image.format}, Size: {image.size}, Mode: {image.mode}")
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Step 1: Extract watermark (if present)
        watermark_data = _extract_watermark(image)
        logger.info(f"Watermark extraction result: {watermark_data}")
        
        # Step 2: Compute perceptual hash
        perceptual_hash = _compute_perceptual_hash(image)
        logger.info(f"Computed perceptual hash: {perceptual_hash}")
        
        # Step 3: Query QLDB for matching records
        registration_records = _query_qldb_for_hash(perceptual_hash)
        logger.info(f"Found {len(registration_records)} matching records in QLDB")
        
        # Step 4: Determine verdict
        verdict_result = _determine_verdict(watermark_data, perceptual_hash, registration_records)
        
        logger.info(f"Verification verdict: {verdict_result['verdict']}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(verdict_result)
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return _error_response(400, str(e))
    except Exception as e:
        logger.error(f"Unexpected error in verification: {e}")
        return _error_response(500, "Internal server error during verification")


def _extract_image_from_event(event):
    """Extract PIL Image from Lambda event."""
    try:
        # Handle different event formats
        body = event.get('body', '')
        headers = event.get('headers', {})
        is_base64 = event.get('isBase64Encoded', False)
        
        content_type = headers.get('content-type', '').lower()
        
        if is_base64:
            # Decode base64 body
            body = base64.b64decode(body)
        
        if 'multipart/form-data' in content_type:
            # Handle multipart form data (simplified parser)
            return _parse_multipart_image(body, content_type)
        else:
            # Assume body is raw image data
            return Image.open(io.BytesIO(body))
            
    except Exception as e:
        logger.error(f"Error extracting image: {e}")
        return None


def _parse_multipart_image(body, content_type):
    """Parse multipart form data to extract image."""
    try:
        # Extract boundary from content-type
        boundary = None
        if 'boundary=' in content_type:
            boundary = content_type.split('boundary=')[1].strip()
        
        if not boundary:
            raise ValueError("No boundary found in multipart data")
        
        # Simple multipart parser
        parts = body.split(f'--{boundary}'.encode())
        
        for part in parts:
            if b'Content-Type: image' in part:
                # Find the image data (after double newline)
                image_start = part.find(b'\r\n\r\n')
                if image_start != -1:
                    image_data = part[image_start + 4:]
                    # Remove trailing boundary markers
                    image_data = image_data.rstrip(b'\r\n--')
                    return Image.open(io.BytesIO(image_data))
        
        raise ValueError("No image found in multipart data")
        
    except Exception as e:
        logger.error(f"Error parsing multipart data: {e}")
        raise


def _extract_watermark(image):
    """Extract watermark from image using steganography."""
    try:
        # Save image to temporary file for steganography library
        temp_path = "/tmp/verify_image.png"
        image.save(temp_path, "PNG")
        
        # Try to extract watermark
        from steganography.steganography import Steganography
        extracted_data = Steganography.decode(temp_path)
        
        # Clean up
        os.remove(temp_path)
        
        return extracted_data if extracted_data else None
        
    except ImportError:
        logger.warning("Steganography library not available, skipping watermark extraction")
        return None
    except Exception as e:
        logger.warning(f"Failed to extract watermark: {e}")
        return None


def _compute_perceptual_hash(image):
    """Compute perceptual hash of the image."""
    try:
        phash = imagehash.phash(image)
        return str(phash)
    except Exception as e:
        logger.error(f"Failed to compute perceptual hash: {e}")
        raise


def _query_qldb_for_hash(perceptual_hash):
    """Query QLDB for records matching the perceptual hash."""
    try:
        from pyqldb.driver.qldb_driver import QldbDriver
        
        driver = QldbDriver(LEDGER_NAME)
        
        def query_hash(txn):
            """Query for matching hash records."""
            statement = "SELECT * FROM registrations WHERE perceptualHash = ?"
            cursor = txn.execute_statement(statement, perceptual_hash)
            return list(cursor)
        
        results = driver.execute_lambda(query_hash)
        driver.close()
        
        return results
        
    except ImportError:
        logger.warning("pyqldb library not available, using mock data")
        # Return mock data for testing
        if perceptual_hash:
            return [{
                'documentId': 'mock-doc-123',
                'timestamp': '2025-08-23T00:00:00Z',
                'perceptualHash': perceptual_hash,
                'status': 'REGISTERED'
            }]
        return []
    except Exception as e:
        logger.error(f"Error querying QLDB: {e}")
        return []


def _determine_verdict(watermark_data, perceptual_hash, registration_records):
    """Determine the authenticity verdict based on available evidence."""
    
    # Initialize verdict data
    verdict_data = {
        'verdict': 'NOT_REGISTERED',
        'confidence': 0.0,
        'details': {
            'watermarkFound': watermark_data is not None,
            'hashMatch': len(registration_records) > 0,
            'registrationDate': None,
            'documentId': None,
            'perceptualHash': perceptual_hash
        }
    }
    
    # If no records found in ledger
    if not registration_records:
        verdict_data['verdict'] = 'NOT_REGISTERED'
        verdict_data['confidence'] = 0.95
        return verdict_data
    
    # Get the most recent registration
    latest_record = registration_records[0]
    if len(registration_records) > 1:
        # Sort by timestamp to get the latest
        registration_records.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        latest_record = registration_records[0]
    
    verdict_data['details']['registrationDate'] = latest_record.get('timestamp')
    verdict_data['details']['documentId'] = latest_record.get('documentId')
    
    # Determine verdict based on evidence
    if watermark_data and watermark_data == latest_record.get('documentId'):
        # Perfect match: watermark contains the correct document ID
        verdict_data['verdict'] = 'VERIFIED'
        verdict_data['confidence'] = 0.98
    elif watermark_data:
        # Watermark exists but doesn't match - suspicious
        verdict_data['verdict'] = 'POTENTIALLY_ALTERED'
        verdict_data['confidence'] = 0.60
        verdict_data['details']['watermarkMismatch'] = True
    elif len(registration_records) > 0:
        # Hash matches but no watermark - could be altered
        verdict_data['verdict'] = 'POTENTIALLY_ALTERED'
        verdict_data['confidence'] = 0.75
        verdict_data['details']['missingWatermark'] = True
    
    return verdict_data


def _error_response(status_code, message):
    """Helper function to create consistent error responses."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps({'error': message})
    }
