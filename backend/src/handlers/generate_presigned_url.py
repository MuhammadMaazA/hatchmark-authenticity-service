"""
Lambda function to generate presigned URLs for secure S3 uploads.
Part of the Hatchmark Digital Authenticity Service.
"""

import boto3
import json
import os
import logging
import uuid
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError

# Initialize powertools logger
logger = Logger()

# Initialize S3 client
s3_client = boto3.client('s3')

@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    AWS Lambda handler for generating presigned URLs.
    
    Expected event body (JSON):
    {
        "filename": "my-art.jpg"
    }
    
    Returns:
    {
        "uploadUrl": "https://...",
        "objectKey": "uploads/uuid/filename"
    }
    """
    
    try:
        # Parse the request body
        if 'body' not in event:
            logger.error("No body in event")
            return _error_response(400, "Request body is required")
        
        body = json.loads(event['body'])
        filename = body.get('filename', '').strip()
        
        # Basic validation
        if not filename:
            logger.error("Filename not provided or empty")
            return _error_response(400, "filename is required and cannot be empty")
        
        # Additional validation - basic security checks
        if len(filename) > 255:
            return _error_response(400, "filename too long (max 255 characters)")
        
        # Check for dangerous characters
        dangerous_chars = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*']
        if any(char in filename for char in dangerous_chars):
            return _error_response(400, "filename contains invalid characters")
        
        # Get the ingestion bucket name from environment variable
        ingestion_bucket = os.environ.get('INGESTION_BUCKET')
        if not ingestion_bucket:
            logger.error("INGESTION_BUCKET environment variable not set")
            return _error_response(500, "Server configuration error")
        
        # Generate a unique object key to prevent file collisions
        unique_id = str(uuid.uuid4())
        object_key = f"uploads/{unique_id}/{filename}"
        
        logger.info(f"Generating presigned URL for: {object_key}")
        
        # Generate presigned URL for PUT operation (10 minutes expiry)
        try:
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': ingestion_bucket,
                    'Key': object_key,
                    'ContentType': 'image/*'  # Restrict to images for security
                },
                ExpiresIn=600  # 10 minutes as specified
            )
        except ClientError as e:
            logger.error(f"AWS S3 error generating presigned URL: {e}")
            return _error_response(500, "Failed to generate upload URL")
        
        # Success response
        response_body = {
            "uploadUrl": presigned_url,
            "objectKey": object_key
        }
        
        logger.info(f"Successfully generated presigned URL for {filename}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(response_body)
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return _error_response(400, "Invalid JSON in request body")
    
    except ClientError as e:
        logger.error(f"AWS client error: {e}")
        return _error_response(500, "AWS service error")
    
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return _error_response(500, "Internal server error")


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
